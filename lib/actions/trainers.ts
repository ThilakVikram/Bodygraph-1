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
  const email = data.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const branchError = await validateBranch(data.branchId);
  if (branchError) return branchError;

  const tempPassword = generateTempPassword();

  const trainer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash: hashPassword(tempPassword),
        role: "TRAINER",
        name: data.name,
        phone: data.phone || null,
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

  await sendEmail({
    to: email,
    subject: "Your Bodygraph Manager account",
    body: `Welcome, ${data.name}!\n\nYour temporary password is: ${tempPassword}\nPlease log in and change it as soon as possible.`,
  });

  revalidatePath("/trainers");

  return {
    success: true,
    message: `Trainer ${data.name} created successfully.`,
    data: { tempPassword, trainerId: trainer.id },
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
  const email = data.email.toLowerCase();

  const emailOwner = await prisma.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== existing.userId) {
    return { fieldErrors: { email: ["A user with this email already exists."] } };
  }

  const branchError = await validateBranch(data.branchId);
  if (branchError) return branchError;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: existing.userId },
      data: { name: data.name, email, phone: data.phone || null },
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
