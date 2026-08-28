"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { exerciseSchema } from "@/lib/validations/exercise";
import type { ActionState } from "./types";

function toNull(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

function parseExerciseForm(formData: FormData) {
  return exerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    muscleGroup: formData.get("muscleGroup"),
    description: formData.get("description"),
    instructions: formData.get("instructions"),
    mediaUrl: formData.get("mediaUrl"),
  });
}

export async function createExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const parsed = parseExerciseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const exercise = await prisma.exercise.create({
    data: {
      name: parsed.data.name,
      category: toNull(parsed.data.category),
      muscleGroup: toNull(parsed.data.muscleGroup),
      description: toNull(parsed.data.description),
      instructions: toNull(parsed.data.instructions),
      mediaUrl: toNull(parsed.data.mediaUrl),
      createdById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Exercise",
    entityId: exercise.id,
  });
  revalidatePath("/workouts/exercises");

  return { success: true, message: "Exercise added to the library." };
}

export async function updateExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing exercise id." };

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) return { error: "Exercise not found." };

  const parsed = parseExerciseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.exercise.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: toNull(parsed.data.category),
      muscleGroup: toNull(parsed.data.muscleGroup),
      description: toNull(parsed.data.description),
      instructions: toNull(parsed.data.instructions),
      mediaUrl: toNull(parsed.data.mediaUrl),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Exercise",
    entityId: id,
  });
  revalidatePath("/workouts/exercises");

  return { success: true, message: "Exercise updated." };
}

export async function deleteExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing exercise id." };

  const existing = await prisma.exercise.findUnique({ where: { id } });
  if (!existing) return { error: "Exercise not found." };

  const usageCount = await prisma.workoutExercise.count({ where: { exerciseId: id } });
  if (usageCount > 0) {
    return {
      error: "This exercise is used in one or more workout plans and can't be deleted.",
    };
  }

  await prisma.exercise.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "Exercise",
    entityId: id,
  });
  revalidatePath("/workouts/exercises");

  return { success: true, message: "Exercise deleted." };
}
