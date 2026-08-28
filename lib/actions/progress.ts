"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { saveUploadedImage, deleteUploadedFile, UploadError } from "@/lib/upload";
import { progressRecordSchema } from "@/lib/validations/progress";
import type { ActionState } from "./types";

function toNull(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

type CurrentUser = { id: string; role: string };

/** Verifies the current user (Admin, or the member's own Trainer) may record progress for this member. */
async function assertMemberManageable(memberId: string, user: CurrentUser) {
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return { error: "Member not found." } as const;
  if (user.role !== "ADMIN") {
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
    if (!trainer || member.trainerId !== trainer.id) {
      return { error: "You can only record progress for your own members." } as const;
    }
  }
  return { member } as const;
}

function parseProgressForm(formData: FormData) {
  return progressRecordSchema.safeParse({
    memberId: formData.get("memberId"),
    recordDate: formData.get("recordDate"),
    weight: formData.get("weight"),
    bodyFatPercent: formData.get("bodyFatPercent"),
    height: formData.get("height"),
    chest: formData.get("chest"),
    waist: formData.get("waist"),
    arms: formData.get("arms"),
    thighs: formData.get("thighs"),
    notes: formData.get("notes"),
  });
}

async function uploadPhotoIfPresent(formData: FormData): Promise<
  { photoUrl: string | undefined } | { error: string }
> {
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return { photoUrl: undefined };
  }
  try {
    const photoUrl = await saveUploadedImage(photo, "progress");
    return { photoUrl };
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }
}

export async function createProgressRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const parsed = parseProgressForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const check = await assertMemberManageable(parsed.data.memberId, user);
  if ("error" in check) return { error: check.error };

  const uploaded = await uploadPhotoIfPresent(formData);
  if ("error" in uploaded) return { error: uploaded.error };

  const record = await prisma.progressRecord.create({
    data: {
      memberId: parsed.data.memberId,
      recordedById: user.id,
      recordDate: new Date(parsed.data.recordDate),
      weight: parsed.data.weight ?? null,
      bodyFatPercent: parsed.data.bodyFatPercent ?? null,
      height: parsed.data.height ?? null,
      chest: parsed.data.chest ?? null,
      waist: parsed.data.waist ?? null,
      arms: parsed.data.arms ?? null,
      thighs: parsed.data.thighs ?? null,
      notes: toNull(parsed.data.notes),
      photoUrl: uploaded.photoUrl ?? null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "ProgressRecord",
    entityId: record.id,
  });
  revalidatePath("/progress");

  return { success: true, message: "Progress record added." };
}

export async function updateProgressRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing progress record id." };

  const existing = await prisma.progressRecord.findUnique({ where: { id } });
  if (!existing) return { error: "Progress record not found." };

  const parsed = parseProgressForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const check = await assertMemberManageable(existing.memberId, user);
  if ("error" in check) return { error: check.error };

  const uploaded = await uploadPhotoIfPresent(formData);
  if ("error" in uploaded) return { error: uploaded.error };

  if (uploaded.photoUrl) {
    await deleteUploadedFile(existing.photoUrl);
  }

  await prisma.progressRecord.update({
    where: { id },
    data: {
      recordDate: new Date(parsed.data.recordDate),
      weight: parsed.data.weight ?? null,
      bodyFatPercent: parsed.data.bodyFatPercent ?? null,
      height: parsed.data.height ?? null,
      chest: parsed.data.chest ?? null,
      waist: parsed.data.waist ?? null,
      arms: parsed.data.arms ?? null,
      thighs: parsed.data.thighs ?? null,
      notes: toNull(parsed.data.notes),
      ...(uploaded.photoUrl ? { photoUrl: uploaded.photoUrl } : {}),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "ProgressRecord",
    entityId: id,
  });
  revalidatePath("/progress");

  return { success: true, message: "Progress record updated." };
}

export async function deleteProgressRecordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing progress record id." };

  const existing = await prisma.progressRecord.findUnique({ where: { id } });
  if (!existing) return { error: "Progress record not found." };

  const check = await assertMemberManageable(existing.memberId, user);
  if ("error" in check) return { error: check.error };

  await prisma.progressRecord.delete({ where: { id } });
  await deleteUploadedFile(existing.photoUrl);

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "ProgressRecord",
    entityId: id,
  });
  revalidatePath("/progress");

  return { success: true, message: "Progress record deleted." };
}
