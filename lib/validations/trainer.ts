import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const trainerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  phone: z.preprocess(emptyToUndefined, z.string().trim().max(20).optional()),
  specialization: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(120).optional(),
  ),
  bio: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  experienceYears: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().int("Enter a whole number").min(0).max(80).optional(),
  ),
  branchId: z.preprocess(emptyToUndefined, z.string().trim().optional()),
});

export type TrainerInput = z.infer<typeof trainerInputSchema>;
