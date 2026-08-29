import { z } from "zod";

/** Converts "" / null / undefined to undefined before the wrapped schema runs. */
function optionalNumber(message: string) {
  return z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? undefined : val),
    z.coerce.number({ message }).nonnegative(message).optional(),
  );
}

export const createMembershipSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required"),
  planId: z.string().trim().min(1, "Plan is required"),
  startDate: z.string().trim().min(1, "Start date is required"),
  amount: optionalNumber("Amount can't be negative"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;

export const renewMembershipSchema = z.object({
  memberId: z.string().trim().min(1, "Member is required"),
  planId: z.string().trim().min(1, "Plan is required"),
  amount: optionalNumber("Amount can't be negative"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type RenewMembershipInput = z.infer<typeof renewMembershipSchema>;

export const cancelMembershipSchema = z.object({
  membershipId: z.string().trim().min(1, "Membership is required"),
});

export type CancelMembershipInput = z.infer<typeof cancelMembershipSchema>;
