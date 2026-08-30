import { z } from "zod";

export const manualCheckInSchema = z.object({
  memberId: z.string().trim().min(1, "Select a member"),
});

export const checkOutSchema = z.object({
  attendanceId: z.string().trim().min(1, "Missing attendance record"),
});

export const qrCheckInSchema = z.object({
  qrToken: z.string().trim().min(1, "Scan or enter a QR code"),
});

export const kioskLookupSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username, phone number, or member ID"),
});
