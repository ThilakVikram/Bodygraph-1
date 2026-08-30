import { z } from "zod";

/**
 * Roles that can be created/edited directly from the Users (staff account) module.
 * Trainer/Member accounts are created together with their business profile by the
 * Trainers/Members modules — not duplicated here.
 */
export const STAFF_ROLES = ["ADMIN", "RECEPTIONIST"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30)
  .regex(/^[a-z0-9._-]+$/, "Only lowercase letters, numbers, dots, underscores and hyphens");

export const createStaffUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  username: usernameSchema,
  phone: z.string().trim().min(1, "Phone number is required").max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  role: z.enum(STAFF_ROLES, { message: "Role must be Admin or Receptionist" }),
});
export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  username: usernameSchema,
  phone: z.string().trim().min(1, "Phone number is required").max(30),
  isActive: z.boolean(),
  role: z.enum(STAFF_ROLES).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
