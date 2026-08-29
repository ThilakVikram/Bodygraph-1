"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { workoutPlanSchema, workoutExerciseSchema } from "@/lib/validations/workout";
import type { ActionState } from "./types";

function toNull(value?: string): string | null {
  return value && value.length > 0 ? value : null;
}

type CurrentUser = { id: string; role: string };

/** Resolves the trainerId a plan should be created/edited under, enforcing the access matrix. */
async function resolveTrainerId(
  user: CurrentUser,
  requestedTrainerId: string | undefined,
): Promise<{ trainerId: string } | { error: string }> {
  if (user.role === "ADMIN") {
    if (!requestedTrainerId) return { error: "Select a trainer." };
    const trainer = await prisma.trainer.findUnique({ where: { id: requestedTrainerId } });
    if (!trainer) return { error: "Trainer not found." };
    return { trainerId: trainer.id };
  }
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
  if (!trainer) return { error: "Trainer profile not found." };
  return { trainerId: trainer.id };
}

async function assertPlanEditable(workoutPlanId: string, user: CurrentUser) {
  const plan = await prisma.workoutPlan.findUnique({ where: { id: workoutPlanId } });
  if (!plan) return { error: "Workout plan not found." } as const;
  if (user.role !== "ADMIN") {
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
    if (!trainer || plan.trainerId !== trainer.id) {
      return { error: "You can only modify your own plans." } as const;
    }
  }
  return { plan } as const;
}

export async function createWorkoutPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const parsed = workoutPlanSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    memberId: formData.get("memberId"),
    trainerId: formData.get("trainerId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status") || "ACTIVE",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const trainerResult = await resolveTrainerId(user, parsed.data.trainerId);
  if ("error" in trainerResult) return { error: trainerResult.error };
  const { trainerId } = trainerResult;

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member) return { error: "Member not found." };
  if (user.role === "TRAINER" && member.trainerId !== trainerId) {
    return { error: "You can only create plans for your own members." };
  }

  const plan = await prisma.workoutPlan.create({
    data: {
      name: parsed.data.name,
      description: toNull(parsed.data.description),
      memberId: member.id,
      trainerId,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status,
    },
  });

  await createNotification({
    userId: member.userId,
    type: "WORKOUT_ASSIGNED",
    title: "New workout plan assigned",
    message: `"${plan.name}" has been assigned to you.`,
    link: "/workouts",
  });
  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "WorkoutPlan",
    entityId: plan.id,
  });
  revalidatePath("/workouts");

  redirect(`/workouts/${plan.id}`);
}

export async function updateWorkoutPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing workout plan id." };

  const check = await assertPlanEditable(id, user);
  if ("error" in check) return { error: check.error };

  const parsed = workoutPlanSchema
    .pick({ name: true, description: true, startDate: true, endDate: true, status: true })
    .safeParse({
      name: formData.get("name"),
      description: formData.get("description"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      status: formData.get("status"),
    });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.workoutPlan.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: toNull(parsed.data.description),
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      status: parsed.data.status,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "WorkoutPlan",
    entityId: id,
  });
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);

  return { success: true, message: "Workout plan updated." };
}

export async function deleteWorkoutPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing workout plan id." };

  const check = await assertPlanEditable(id, user);
  if ("error" in check) return { error: check.error };

  await prisma.workoutPlan.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "WorkoutPlan",
    entityId: id,
  });
  revalidatePath("/workouts");

  redirect("/workouts");
}

function parseWorkoutExerciseForm(formData: FormData) {
  return workoutExerciseSchema.safeParse({
    exerciseId: formData.get("exerciseId"),
    dayOfWeek: formData.get("dayOfWeek"),
    sets: formData.get("sets"),
    reps: formData.get("reps"),
    weight: formData.get("weight"),
    restSeconds: formData.get("restSeconds"),
    durationMinutes: formData.get("durationMinutes"),
    order: formData.get("order"),
    notes: formData.get("notes"),
  });
}

export async function addWorkoutExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const workoutPlanId = String(formData.get("workoutPlanId") ?? "");
  if (!workoutPlanId) return { error: "Missing workout plan id." };

  const check = await assertPlanEditable(workoutPlanId, user);
  if ("error" in check) return { error: check.error };

  const parsed = parseWorkoutExerciseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: parsed.data.exerciseId } });
  if (!exercise) return { error: "Exercise not found." };

  await prisma.workoutExercise.create({
    data: {
      workoutPlanId,
      exerciseId: parsed.data.exerciseId,
      dayOfWeek: parsed.data.dayOfWeek,
      sets: parsed.data.sets ?? null,
      reps: toNull(parsed.data.reps),
      weight: toNull(parsed.data.weight),
      restSeconds: parsed.data.restSeconds ?? null,
      durationMinutes: parsed.data.durationMinutes ?? null,
      order: parsed.data.order,
      notes: toNull(parsed.data.notes),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "WorkoutExercise",
    entityId: workoutPlanId,
  });
  revalidatePath(`/workouts/${workoutPlanId}`);

  return { success: true, message: "Exercise added to plan." };
}

export async function updateWorkoutExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  const workoutPlanId = String(formData.get("workoutPlanId") ?? "");
  if (!id || !workoutPlanId) return { error: "Missing exercise entry id." };

  const check = await assertPlanEditable(workoutPlanId, user);
  if ("error" in check) return { error: check.error };

  const existing = await prisma.workoutExercise.findUnique({ where: { id } });
  if (!existing || existing.workoutPlanId !== workoutPlanId) {
    return { error: "Exercise entry not found." };
  }

  const parsed = parseWorkoutExerciseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: parsed.data.exerciseId } });
  if (!exercise) return { error: "Exercise not found." };

  await prisma.workoutExercise.update({
    where: { id },
    data: {
      exerciseId: parsed.data.exerciseId,
      dayOfWeek: parsed.data.dayOfWeek,
      sets: parsed.data.sets ?? null,
      reps: toNull(parsed.data.reps),
      weight: toNull(parsed.data.weight),
      restSeconds: parsed.data.restSeconds ?? null,
      durationMinutes: parsed.data.durationMinutes ?? null,
      order: parsed.data.order,
      notes: toNull(parsed.data.notes),
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "WorkoutExercise",
    entityId: id,
  });
  revalidatePath(`/workouts/${workoutPlanId}`);

  return { success: true, message: "Exercise entry updated." };
}

export async function removeWorkoutExerciseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  const workoutPlanId = String(formData.get("workoutPlanId") ?? "");
  if (!id || !workoutPlanId) return { error: "Missing exercise entry id." };

  const check = await assertPlanEditable(workoutPlanId, user);
  if ("error" in check) return { error: check.error };

  const existing = await prisma.workoutExercise.findUnique({ where: { id } });
  if (!existing || existing.workoutPlanId !== workoutPlanId) {
    return { error: "Exercise entry not found." };
  }

  await prisma.workoutExercise.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "WorkoutExercise",
    entityId: id,
  });
  revalidatePath(`/workouts/${workoutPlanId}`);

  return { success: true, message: "Exercise removed from plan." };
}
