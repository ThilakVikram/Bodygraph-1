"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import {
  createMembershipSchema,
  renewMembershipSchema,
  cancelMembershipSchema,
} from "@/lib/validations/membership";
import { formatDate } from "@/lib/utils";
import type { ActionState } from "./types";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Read-time correction: any membership row still marked ACTIVE whose endDate has
 * passed is flipped to EXPIRED. Call this at the top of list/detail page loads so
 * the DB stays consistent for other modules/dashboard stats (there is no background job).
 */
export async function syncExpiredMemberships(): Promise<void> {
  await prisma.membership.updateMany({
    where: { status: "ACTIVE", endDate: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
}

function revalidateMembershipPaths(id?: string) {
  revalidatePath("/memberships");
  revalidatePath("/membership");
  if (id) revalidatePath(`/memberships/${id}`);
}

export async function createMembershipAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = createMembershipSchema.safeParse({
    memberId: formData.get("memberId"),
    planId: formData.get("planId"),
    startDate: formData.get("startDate"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [member, plan] = await Promise.all([
    prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      include: { user: true },
    }),
    prisma.membershipPlan.findUnique({ where: { id: parsed.data.planId } }),
  ]);
  if (!member) return { error: "Member not found." };
  if (!plan) return { error: "Membership plan not found." };

  const startDate = startOfDay(new Date(parsed.data.startDate));
  if (Number.isNaN(startDate.getTime())) {
    return { fieldErrors: { startDate: ["Enter a valid date"] } };
  }
  const endDate = addDays(startDate, plan.durationDays);
  const status = startDate > startOfDay(new Date()) ? "PENDING" : "ACTIVE";
  const amount = parsed.data.amount ?? plan.price;

  const membership = await prisma.membership.create({
    data: {
      memberId: member.id,
      planId: plan.id,
      startDate,
      endDate,
      status,
      amount,
      notes: parsed.data.notes || null,
    },
  });

  await createNotification({
    userId: member.userId,
    type: "MEMBERSHIP_RENEWAL",
    title: "Membership activated",
    message: `Your ${plan.name} membership is active from ${formatDate(startDate)} to ${formatDate(endDate)}.`,
    link: "/membership",
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Membership",
    entityId: membership.id,
    metadata: { memberId: member.id, planId: plan.id, amount },
  });

  revalidateMembershipPaths(membership.id);

  return { success: true, message: "Membership created." };
}

export async function renewMembershipAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = renewMembershipSchema.safeParse({
    memberId: formData.get("memberId"),
    planId: formData.get("planId"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [member, plan] = await Promise.all([
    prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      include: { user: true },
    }),
    prisma.membershipPlan.findUnique({ where: { id: parsed.data.planId } }),
  ]);
  if (!member) return { error: "Member not found." };
  if (!plan) return { error: "Membership plan not found." };

  const latest = await prisma.membership.findFirst({
    where: { memberId: member.id },
    orderBy: { endDate: "desc" },
  });

  const today = startOfDay(new Date());
  const startDate =
    latest && startOfDay(latest.endDate) >= today
      ? addDays(startOfDay(latest.endDate), 1)
      : today;
  const endDate = addDays(startDate, plan.durationDays);
  const status = startDate > today ? "PENDING" : "ACTIVE";
  const amount = parsed.data.amount ?? plan.price;

  const membership = await prisma.membership.create({
    data: {
      memberId: member.id,
      planId: plan.id,
      startDate,
      endDate,
      status,
      amount,
      notes: parsed.data.notes || null,
    },
  });

  await createNotification({
    userId: member.userId,
    type: "MEMBERSHIP_RENEWAL",
    title: "Membership renewed",
    message: `Your ${plan.name} membership was renewed and now runs from ${formatDate(startDate)} to ${formatDate(endDate)}.`,
    link: "/membership",
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Membership",
    entityId: membership.id,
    metadata: { memberId: member.id, planId: plan.id, amount, renewedFrom: latest?.id ?? null },
  });

  revalidateMembershipPaths(membership.id);
  if (latest) revalidateMembershipPaths(latest.id);

  return { success: true, message: "Membership renewed." };
}

export async function cancelMembershipAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = cancelMembershipSchema.safeParse({
    membershipId: formData.get("membershipId"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.membershipId },
  });
  if (!membership) return { error: "Membership not found." };

  await prisma.membership.update({
    where: { id: membership.id },
    data: { status: "CANCELLED" },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Membership",
    entityId: membership.id,
    metadata: { field: "status", value: "CANCELLED" },
  });

  revalidateMembershipPaths(membership.id);

  return { success: true, message: "Membership cancelled." };
}
