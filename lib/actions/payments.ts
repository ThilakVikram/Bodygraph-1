"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { generateInvoiceNumber, formatCurrency } from "@/lib/utils";
import {
  recordPaymentSchema,
  updatePaymentStatusSchema,
  type PaymentStatus,
} from "@/lib/validations/payment";
import type { ActionState } from "./types";

/** Status transitions a staff member is allowed to make via updatePaymentStatusAction. */
const ALLOWED_TRANSITIONS: Record<string, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["REFUNDED"],
};

export async function recordPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = recordPaymentSchema.safeParse({
    memberId: formData.get("memberId"),
    membershipId: formData.get("membershipId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    status: formData.get("status") || undefined,
    paymentDate: formData.get("paymentDate"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { memberId, membershipId, amount, method, status, paymentDate, notes } = parsed.data;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member) {
    return { fieldErrors: { memberId: ["Selected member was not found."] } };
  }

  if (membershipId) {
    const membership = await prisma.membership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.memberId !== memberId) {
      return {
        fieldErrors: { membershipId: ["That membership does not belong to this member."] },
      };
    }
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceNumber: generateInvoiceNumber(),
      memberId,
      membershipId: membershipId || null,
      amount,
      method,
      status,
      paymentDate,
      notes: notes || null,
      recordedById: user.id,
    },
  });

  if (status === "PAID") {
    await createNotification({
      userId: member.userId,
      type: "PAYMENT_CONFIRMATION",
      title: "Payment received",
      message: `Your payment of ${formatCurrency(amount)} has been recorded (Invoice ${payment.invoiceNumber}).`,
      link: "/payments",
    });
  }

  await writeAuditLog({
    userId: user.id,
    action: "CREATE",
    entity: "Payment",
    entityId: payment.id,
    metadata: { invoiceNumber: payment.invoiceNumber, amount, method, status, memberId },
  });

  revalidatePath("/payments");

  return {
    success: true,
    message: `Payment recorded (Invoice ${payment.invoiceNumber}).`,
  };
}

export async function updatePaymentStatusAction(
  paymentId: string,
  status: PaymentStatus,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = updatePaymentStatusSchema.safeParse({ paymentId, status });
  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const payment = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
    include: { member: { include: { user: true } } },
  });
  if (!payment) {
    return { error: "Payment not found." };
  }

  const allowed = ALLOWED_TRANSITIONS[payment.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return {
      error: `Cannot change status from ${payment.status} to ${parsed.data.status}.`,
    };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: parsed.data.status },
  });

  if (updated.status === "PAID") {
    await createNotification({
      userId: payment.member.userId,
      type: "PAYMENT_CONFIRMATION",
      title: "Payment received",
      message: `Your payment of ${formatCurrency(payment.amount)} has been confirmed (Invoice ${payment.invoiceNumber}).`,
      link: "/payments",
    });
  }

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE",
    entity: "Payment",
    entityId: payment.id,
    metadata: { from: payment.status, to: updated.status },
  });

  revalidatePath("/payments");

  return {
    success: true,
    message: `Payment marked as ${updated.status.toLowerCase()}.`,
  };
}
