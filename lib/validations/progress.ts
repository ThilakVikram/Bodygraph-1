import { z } from "zod";

const optionalMeasurement = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.number().nonnegative().optional(),
);

export const progressRecordSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
  recordDate: z.string().trim().min(1, "Record date is required"),
  weight: optionalMeasurement,
  bodyFatPercent: optionalMeasurement,
  height: optionalMeasurement,
  chest: optionalMeasurement,
  waist: optionalMeasurement,
  arms: optionalMeasurement,
  thighs: optionalMeasurement,
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ProgressRecordInput = z.infer<typeof progressRecordSchema>;
