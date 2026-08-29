"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { membershipPlanSchema } from "@/lib/validations/membership-plan";
import type { ActionState } from "./types";

function parseInput(formData: FormData) {
  return membershipPlanSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationDays: formData.get("durationDays"),
    price: formData.get("price"),
    features: formData.get("features"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
}

export async function createMembershipPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const plan = await prisma.membershipPlan.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationDays: parsed.data.durationDays,
      price: parsed.data.price,
      features: JSON.stringify(parsed.data.features),
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "MembershipPlan",
    entityId: plan.id,
    metadata: { name: plan.name },
  });

  revalidatePath("/membership-plans");

  return { success: true, message: "Membership plan created." };
}

export async function updateMembershipPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing plan id." };

  const parsed = parseInput(formData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!existing) return { error: "Membership plan not found." };

  await prisma.membershipPlan.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      durationDays: parsed.data.durationDays,
      price: parsed.data.price,
      features: JSON.stringify(parsed.data.features),
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "MembershipPlan",
    entityId: id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath("/membership-plans");

  return { success: true, message: "Membership plan updated." };
}

export async function togglePlanActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing plan id." };

  const existing = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!existing) return { error: "Membership plan not found." };

  const updated = await prisma.membershipPlan.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "MembershipPlan",
    entityId: id,
    metadata: { field: "isActive", value: updated.isActive },
  });

  revalidatePath("/membership-plans");

  return {
    success: true,
    message: updated.isActive ? "Plan activated." : "Plan deactivated.",
  };
}

export async function deleteMembershipPlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing plan id." };

  const existing = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!existing) return { error: "Membership plan not found." };

  const membershipCount = await prisma.membership.count({ where: { planId: id } });
  if (membershipCount > 0) {
    return {
      error: "This plan has memberships and can't be deleted. Deactivate it instead.",
    };
  }

  await prisma.membershipPlan.delete({ where: { id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE",
    entity: "MembershipPlan",
    entityId: id,
    metadata: { name: existing.name },
  });

  revalidatePath("/membership-plans");

  return { success: true, message: "Membership plan deleted." };
}
