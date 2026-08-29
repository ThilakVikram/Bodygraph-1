"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { dietPlanSchema, dietItemSchema } from "@/lib/validations/diet";
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

async function assertPlanEditable(dietPlanId: string, user: CurrentUser) {
  const plan = await prisma.dietPlan.findUnique({ where: { id: dietPlanId } });
  if (!plan) return { error: "Diet plan not found." } as const;
  if (user.role !== "ADMIN") {
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
    if (!trainer || plan.trainerId !== trainer.id) {
      return { error: "You can only modify your own plans." } as const;
    }
  }
  return { plan } as const;
}

export async function createDietPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const parsed = dietPlanSchema.safeParse({
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

  const plan = await prisma.dietPlan.create({
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
    type: "DIET_ASSIGNED",
    title: "New diet plan assigned",
    message: `"${plan.name}" has been assigned to you.`,
    link: "/diets",
  });
  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "DietPlan",
    entityId: plan.id,
  });
  revalidatePath("/diets");

  redirect(`/diets/${plan.id}`);
}

export async function updateDietPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing diet plan id." };

  const check = await assertPlanEditable(id, user);
  if ("error" in check) return { error: check.error };

  const parsed = dietPlanSchema
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

  await prisma.dietPlan.update({
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
    entity: "DietPlan",
    entityId: id,
  });
  revalidatePath("/diets");
  revalidatePath(`/diets/${id}`);

  return { success: true, message: "Diet plan updated." };
}

export async function deleteDietPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing diet plan id." };

  const check = await assertPlanEditable(id, user);
  if ("error" in check) return { error: check.error };

  await prisma.dietPlan.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "DietPlan",
    entityId: id,
  });
  revalidatePath("/diets");

  redirect("/diets");
}

function parseDietItemForm(formData: FormData) {
  return dietItemSchema.safeParse({
    mealType: formData.get("mealType"),
    foodName: formData.get("foodName"),
    quantity: formData.get("quantity"),
    calories: formData.get("calories"),
    protein: formData.get("protein"),
    carbs: formData.get("carbs"),
    fat: formData.get("fat"),
    timing: formData.get("timing"),
    instructions: formData.get("instructions"),
    order: formData.get("order"),
  });
}

export async function addDietItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const dietPlanId = String(formData.get("dietPlanId") ?? "");
  if (!dietPlanId) return { error: "Missing diet plan id." };

  const check = await assertPlanEditable(dietPlanId, user);
  if ("error" in check) return { error: check.error };

  const parsed = parseDietItemForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.dietItem.create({
    data: {
      dietPlanId,
      mealType: parsed.data.mealType,
      foodName: parsed.data.foodName,
      quantity: toNull(parsed.data.quantity),
      calories: parsed.data.calories ?? null,
      protein: parsed.data.protein ?? null,
      carbs: parsed.data.carbs ?? null,
      fat: parsed.data.fat ?? null,
      timing: toNull(parsed.data.timing),
      instructions: toNull(parsed.data.instructions),
      order: parsed.data.order,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "DietItem",
    entityId: dietPlanId,
  });
  revalidatePath(`/diets/${dietPlanId}`);

  return { success: true, message: "Food item added to plan." };
}

export async function updateDietItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  const dietPlanId = String(formData.get("dietPlanId") ?? "");
  if (!id || !dietPlanId) return { error: "Missing food item id." };

  const check = await assertPlanEditable(dietPlanId, user);
  if ("error" in check) return { error: check.error };

  const existing = await prisma.dietItem.findUnique({ where: { id } });
  if (!existing || existing.dietPlanId !== dietPlanId) {
    return { error: "Food item not found." };
  }

  const parsed = parseDietItemForm(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.dietItem.update({
    where: { id },
    data: {
      mealType: parsed.data.mealType,
      foodName: parsed.data.foodName,
      quantity: toNull(parsed.data.quantity),
      calories: parsed.data.calories ?? null,
      protein: parsed.data.protein ?? null,
      carbs: parsed.data.carbs ?? null,
      fat: parsed.data.fat ?? null,
      timing: toNull(parsed.data.timing),
      instructions: toNull(parsed.data.instructions),
      order: parsed.data.order,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "DietItem",
    entityId: id,
  });
  revalidatePath(`/diets/${dietPlanId}`);

  return { success: true, message: "Food item updated." };
}

export async function removeDietItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "TRAINER");

  const id = String(formData.get("id") ?? "");
  const dietPlanId = String(formData.get("dietPlanId") ?? "");
  if (!id || !dietPlanId) return { error: "Missing food item id." };

  const check = await assertPlanEditable(dietPlanId, user);
  if ("error" in check) return { error: check.error };

  const existing = await prisma.dietItem.findUnique({ where: { id } });
  if (!existing || existing.dietPlanId !== dietPlanId) {
    return { error: "Food item not found." };
  }

  await prisma.dietItem.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "DietItem",
    entityId: id,
  });
  revalidatePath(`/diets/${dietPlanId}`);

  return { success: true, message: "Food item removed from plan." };
}
