import { z } from "zod";

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  muscleGroup: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  instructions: z.string().trim().max(4000).optional().or(z.literal("")),
  mediaUrl: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
