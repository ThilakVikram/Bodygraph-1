import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30)
  .regex(/^[a-z0-9._-]+$/, "Only lowercase letters, numbers, dots, underscores and hyphens");

export const trainerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  username: usernameSchema,
  phone: z.string().trim().min(1, "Phone number is required").max(20),
  email: z.preprocess(
    emptyToUndefined,
    z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  ),
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
