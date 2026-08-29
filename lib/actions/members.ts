"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/generate-password";
import { generateQrToken } from "@/lib/qr";
import { generateMemberCode } from "@/lib/utils";
import { saveUploadedImage, deleteUploadedFile, UploadError } from "@/lib/upload";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { memberInputSchema, updateOwnProfileSchema } from "@/lib/validations/member";
import type { ActionState } from "./types";

function parseMemberForm(formData: FormData) {
  return memberInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender"),
    address: formData.get("address"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    branchId: formData.get("branchId"),
    trainerId: formData.get("trainerId"),
  });
}

async function generateUniqueMemberCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateMemberCode();
    const existing = await prisma.member.findUnique({
      where: { memberCode: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  return generateMemberCode();
}

/** Validates optional branch/trainer references; returns a fieldErrors ActionState on failure, or null if valid. */
async function validateReferences(data: {
  branchId?: string;
  trainerId?: string;
}): Promise<ActionState | null> {
  if (data.branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) return { fieldErrors: { branchId: ["Select a valid branch."] } };
  }
  if (data.trainerId) {
    const trainer = await prisma.trainer.findUnique({ where: { id: data.trainerId } });
    if (!trainer) return { fieldErrors: { trainerId: ["Select a valid trainer."] } };
  }
  return null;
}

export async function createMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = parseMemberForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const referenceError = await validateReferences(data);
  if (referenceError) return referenceError;

  const tempPassword = generateTempPassword();
  const memberCode = await generateUniqueMemberCode();
  const qrToken = generateQrToken();

  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(tempPassword),
        role: "MEMBER",
        name: data.name,
        phone: data.phone || null,
        mustChangePassword: true,
      },
    });
    return tx.member.create({
      data: {
        userId: user.id,
        memberCode,
        qrToken,
        branchId: data.branchId || null,
        trainerId: data.trainerId || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        address: data.address || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
      },
    });
  });

  let photoWarning = "";
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    try {
      const photoUrl = await saveUploadedImage(photo, "members");
      await prisma.member.update({ where: { id: member.id }, data: { photoUrl } });
    } catch (err) {
      photoWarning =
        err instanceof UploadError
          ? ` However, the photo could not be saved: ${err.message}`
          : " However, the photo could not be saved.";
    }
  }

  await writeAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Member",
    entityId: member.id,
    metadata: { memberCode },
  });

  await sendEmail({
    to: email,
    subject: "Your Bodygraph Manager account",
    body: `Welcome, ${data.name}!\n\nYour temporary password is: ${tempPassword}\nPlease log in and change it as soon as possible.`,
  });

  revalidatePath("/members");

  return {
    success: true,
    message: `Member ${data.name} created successfully.${photoWarning}`,
    data: { tempPassword, memberId: member.id, memberCode },
  };
}

export async function updateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "RECEPTIONIST");

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return { error: "Missing member id." };

  const existingMember = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existingMember) return { error: "Member not found." };

  const parsed = parseMemberForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== existingMember.userId) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const referenceError = await validateReferences(data);
  if (referenceError) return referenceError;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existingMember.userId },
      data: { name: data.name, email, phone: data.phone || null },
    }),
    prisma.member.update({
      where: { id: memberId },
      data: {
        branchId: data.branchId || null,
        trainerId: data.trainerId || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        address: data.address || null,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactPhone: data.emergencyContactPhone || null,
      },
    }),
  ]);

  await writeAuditLog({
    userId: actor.id,
    action: "UPDATE",
    entity: "Member",
    entityId: memberId,
  });

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members/${memberId}/edit`);

  redirect(`/members/${memberId}`);
}

async function setMemberStatus(formData: FormData, status: "ACTIVE" | "INACTIVE"): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "RECEPTIONIST");

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return { error: "Missing member id." };

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Member not found." };

  await prisma.member.update({ where: { id: memberId }, data: { status } });
  await writeAuditLog({
    userId: actor.id,
    action: "UPDATE",
    entity: "Member",
    entityId: memberId,
    metadata: { status },
  });

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);

  return {
    success: true,
    message: status === "ACTIVE" ? "Member reactivated." : "Member deactivated.",
  };
}

export async function deactivateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setMemberStatus(formData, "INACTIVE");
}

export async function reactivateMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setMemberStatus(formData, "ACTIVE");
}

export async function updateMemberPhotoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN", "RECEPTIONIST");

  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return { error: "Missing member id." };

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Member not found." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { error: "Choose an image to upload." };
  }

  let photoUrl: string;
  try {
    photoUrl = await saveUploadedImage(photo, "members");
  } catch (err) {
    return { error: err instanceof UploadError ? err.message : "Failed to upload photo." };
  }

  await prisma.member.update({ where: { id: memberId }, data: { photoUrl } });
  await deleteUploadedFile(member.photoUrl);

  await writeAuditLog({
    userId: actor.id,
    action: "UPDATE",
    entity: "Member",
    entityId: memberId,
    metadata: { field: "photo" },
  });

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  revalidatePath(`/members/${memberId}/edit`);

  return { success: true, message: "Photo updated." };
}

export async function updateOwnProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("MEMBER");

  const member = await prisma.member.findUnique({ where: { userId: user.id } });
  if (!member || member.userId !== user.id) {
    return { error: "Member profile not found." };
  }

  const parsed = updateOwnProfileSchema.safeParse({
    address: formData.get("address"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.member.update({
    where: { id: member.id },
    data: {
      address: parsed.data.address || null,
      emergencyContactName: parsed.data.emergencyContactName || null,
      emergencyContactPhone: parsed.data.emergencyContactPhone || null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Member",
    entityId: member.id,
    metadata: { field: "profile" },
  });

  revalidatePath("/profile");

  return { success: true, message: "Profile updated." };
}
