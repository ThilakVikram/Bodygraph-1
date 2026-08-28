import { z } from "zod";

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

/** Shared shape for both create and update member forms. */
export const memberInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
  dateOfBirth: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
      .optional(),
  ),
  gender: z.preprocess(emptyToUndefined, z.enum(GENDERS).optional()),
  address: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  emergencyContactName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  emergencyContactPhone: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(20).optional(),
  ),
  branchId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  trainerId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export type MemberInput = z.infer<typeof memberInputSchema>;

/** Fields a MEMBER may edit about themselves on /profile. */
export const updateOwnProfileSchema = z.object({
  address: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
  emergencyContactName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  emergencyContactPhone: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(20).optional(),
  ),
});
