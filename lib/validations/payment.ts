import { z } from "zod";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants";

export const recordPaymentSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
  membershipId: z.string().trim().optional().or(z.literal("")),
  amount: z.coerce
    .number("Enter a valid amount")
    .positive("Amount must be greater than 0"),
  method: z.enum(PAYMENT_METHODS, "Select a valid payment method"),
  status: z.enum(PAYMENT_STATUSES, "Select a valid status").default("PAID"),
  paymentDate: z.coerce.date("Enter a valid payment date"),
  notes: z
    .string()
    .trim()
    .max(500, "Keep notes under 500 characters")
    .optional()
    .or(z.literal("")),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const updatePaymentStatusSchema = z.object({
  paymentId: z.string().trim().min(1, "Missing payment"),
  status: z.enum(PAYMENT_STATUSES, "Select a valid status"),
});

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
