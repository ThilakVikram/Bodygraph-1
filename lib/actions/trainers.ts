"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { generateTempPassword } from "@/lib/auth/generate-password";
import { writeAuditLog } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { trainerInputSchema } from "@/lib/validations/trainer";
import type { ActionState } from "./types";

function parseTrainerForm(formData: FormData) {
  return trainerInputSchema.safeParse({
    name: formData.get("name"),
    username: formData.get("username"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    specialization: formData.get("specialization"),
    bio: formData.get("bio"),
    experienceYears: formData.get("experienceYears"),
    branchId: formData.get("branchId"),
  });
}

async function validateBranch(branchId?: string): Promise<ActionState | null> {
  if (!branchId) return null;
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { fieldErrors: { branchId: ["Select a valid branch."] } };
  return null;
}

export async function createTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");

  const parsed = parseTrainerForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const email = data.email || undefined;

  const [usernameOwner, phoneOwner, emailOwner] = await Promise.all([
    prisma.user.findUnique({ where: { username: data.username } }),
    prisma.user.findUnique({ where: { phone: data.phone } }),
    email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
  ]);
  if (usernameOwner) {
    return { fieldErrors: { username: ["This username is already taken."] } };
  }
  if (phoneOwner) {
    return { fieldErrors: { phone: ["A user with this phone number already exists."] } };
  }
  if (emailOwner) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const branchError = await validateBranch(data.branchId);
  if (branchError) return branchError;

  const tempPassword = generateTempPassword();

  const trainer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username: data.username,
        email,
        passwordHash: hashPassword(tempPassword),
        role: "TRAINER",
        name: data.name,
        phone: data.phone,
        mustChangePassword: true,
      },
    });
    return tx.trainer.create({
      data: {
        userId: user.id,
        branchId: data.branchId || null,
        specialization: data.specialization || null,
        bio: data.bio || null,
        experienceYears: data.experienceYears ?? 0,
      },
    });
  });

  await writeAuditLog({
    userId: actor.id,
    action: "CREATE",
    entity: "Trainer",
    entityId: trainer.id,
  });

  if (email) {
    await sendEmail({
      to: email,
      subject: "Your Bodygraph Manager account",
      body: `Welcome, ${data.name}!\n\nYour username is: ${data.username}\nYour temporary password is: ${tempPassword}\nPlease log in and change it as soon as possible.`,
    });
  }

  revalidatePath("/trainers");

  return {
    success: true,
    message: `Trainer ${data.name} created successfully.`,
    data: { tempPassword, trainerId: trainer.id, username: data.username },
  };
}

export async function updateTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireRole("ADMIN");

  const trainerId = String(formData.get("trainerId") ?? "");
  if (!trainerId) return { error: "Missing trainer id." };

  const existing = await prisma.trainer.findUnique({ where: { id: trainerId } });
  if (!existing) return { error: "Trainer not found." };

  const parsed = parseTrainerForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;
  const email = data.email || undefined;

  const [usernameOwner, phoneOwner, emailOwner] = await Promise.all([
    prisma.user.findUnique({ where: { username: data.username } }),
    prisma.user.findUnique({ where: { phone: data.phone } }),
    email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
  ]);
  if (usernameOwner && usernameOwner.id !== existing.userId) {
    return { fieldErrors: { username: ["This username is already taken."] } };
  }
  if (phoneOwner && phoneOwner.id !== existing.userId) {
    return { fieldErrors: { phone: ["A user with this phone number already exists."] } };
  }
  if (emailOwner && emailOwner.id !== existing.userId) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const branchError = await validateBranch(data.branchId);
  if (branchError) return branchError;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existing.userId },
      data: { name: data.name, username: data.username, email: email ?? null, phone: data.phone },
    }),
    prisma.trainer.update({
      where: { id: trainerId },
      data: {
        branchId: data.branchId || null,
        specialization: data.specialization || null,
        bio: data.bio || null,
        experienceYears: data.experienceYears ?? 0,
      },
    }),
  ]);

  await writeAuditLog({
    userId: actor.id,
    action: "UPDATE",
    entity: "Trainer",
    entityId: trainerId,
  });

  revalidatePath("/trainers");
  revalidatePath(`/trainers/${trainerId}`);
  revalidatePath(`/trainers/${trainerId}/edit`);

  redirect(`/trainers/${trainerId}`);
}

async function setTrainerActive(formData: FormData, isActive: boolean): Promise<ActionState> {
  const actor = await requireRole("ADMIN");

  const trainerId = String(formData.get("trainerId") ?? "");
  if (!trainerId) return { error: "Missing trainer id." };

  const trainer = await prisma.trainer.findUnique({ where: { id: trainerId } });
  if (!trainer) return { error: "Trainer not found." };

  await prisma.trainer.update({ where: { id: trainerId }, data: { isActive } });
  await writeAuditLog({
    userId: actor.id,
    action: "UPDATE",
    entity: "Trainer",
    entityId: trainerId,
    metadata: { isActive },
  });

  revalidatePath("/trainers");
  revalidatePath(`/trainers/${trainerId}`);

  return { success: true, message: isActive ? "Trainer reactivated." : "Trainer deactivated." };
}

export async function deactivateTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setTrainerActive(formData, false);
}

export async function reactivateTrainerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return setTrainerActive(formData, true);
}
