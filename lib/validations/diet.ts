import { z } from "zod";
import { WORKOUT_STATUSES, MEAL_TYPES } from "@/lib/constants";

// FormData.get() returns null (not undefined) for a field that isn't present in the
// submitted form at all — e.g. the trainerId <select> is only rendered for Admins.
const optionalString = z.preprocess(
  (v) => (v === null || v === undefined ? "" : v),
  z.string().trim().optional().or(z.literal("")),
);

export const dietPlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: optionalString,
  memberId: z.string().trim().min(1, "Select a member"),
  trainerId: optionalString,
  startDate: z.string().trim().min(1, "Start date is required"),
  endDate: optionalString,
  // DietPlan.status shares the same allowed values as WorkoutPlan.status (see schema.prisma).
  status: z.enum(WORKOUT_STATUSES).default("ACTIVE"),
});

export type DietPlanInput = z.infer<typeof dietPlanSchema>;

const optionalFloat = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);

const orderInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : v),
  z.coerce.number().int().nonnegative().default(0),
);

export const dietItemSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  foodName: z.string().trim().min(1, "Food name is required").max(120),
  quantity: z.string().trim().max(60).optional().or(z.literal("")),
  calories: optionalFloat,
  protein: optionalFloat,
  carbs: optionalFloat,
  fat: optionalFloat,
  timing: z.string().trim().max(60).optional().or(z.literal("")),
  instructions: z.string().trim().max(1000).optional().or(z.literal("")),
  order: orderInt,
});

export type DietItemInput = z.infer<typeof dietItemSchema>;
