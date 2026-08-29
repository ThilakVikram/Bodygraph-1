import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(150),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  isActive: z.boolean(),
});
export type BranchInput = z.infer<typeof branchSchema>;
