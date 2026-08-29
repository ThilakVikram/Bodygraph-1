import { z } from "zod";
import { WORKOUT_STATUSES } from "@/lib/constants";

// FormData.get() returns null (not undefined) for a field that isn't present in the
// submitted form at all — e.g. the trainerId <select> is only rendered for Admins.
const optionalString = z.preprocess(
  (v) => (v === null || v === undefined ? "" : v),
  z.string().trim().optional().or(z.literal("")),
);

export const workoutPlanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: optionalString,
  memberId: z.string().trim().min(1, "Select a member"),
  trainerId: optionalString,
  startDate: z.string().trim().min(1, "Start date is required"),
  endDate: optionalString,
  status: z.enum(WORKOUT_STATUSES).default("ACTIVE"),
});

export type WorkoutPlanInput = z.infer<typeof workoutPlanSchema>;

/** Coerces "" / null / undefined to undefined before numeric coercion, so empty form fields are treated as absent rather than 0. */
const optionalInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().int().optional(),
);

const orderInt = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : v),
  z.coerce.number().int().nonnegative().default(0),
);

export const workoutExerciseSchema = z.object({
  exerciseId: z.string().trim().min(1, "Select an exercise"),
  dayOfWeek: z.coerce.number().int().min(0, "Invalid day").max(6, "Invalid day"),
  sets: optionalInt,
  reps: z.string().trim().max(30).optional().or(z.literal("")),
  weight: z.string().trim().max(30).optional().or(z.literal("")),
  restSeconds: optionalInt,
  durationMinutes: optionalInt,
  order: orderInt,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;
