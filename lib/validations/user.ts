import { z } from "zod";

/**
 * Roles that can be created/edited directly from the Users (staff account) module.
 * Trainer/Member accounts are created together with their business profile by the
 * Trainers/Members modules — not duplicated here.
 */
export const STAFF_ROLES = ["ADMIN", "RECEPTIONIST"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const createStaffUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(STAFF_ROLES, { message: "Role must be Admin or Receptionist" }),
});
export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  isActive: z.boolean(),
  role: z.enum(STAFF_ROLES).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
