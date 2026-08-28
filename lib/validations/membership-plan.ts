import { z } from "zod";

/** Splits a newline- or comma-separated textarea value into a trimmed, non-empty string array. */
function parseFeatures(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

export const membershipPlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
  durationDays: z.coerce
    .number({ message: "Duration must be a number" })
    .int("Duration must be a whole number of days")
    .positive("Duration must be greater than 0"),
  price: z.coerce
    .number({ message: "Price must be a number" })
    .nonnegative("Price can't be negative"),
  features: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? parseFeatures(value) : [])),
  isActive: z.coerce.boolean().default(true),
});

export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;
