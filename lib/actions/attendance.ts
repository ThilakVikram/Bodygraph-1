"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  manualCheckInSchema,
  checkOutSchema,
  qrCheckInSchema,
} from "@/lib/validations/attendance";
import type { ActionState } from "./types";

/** Admin/Receptionist: manually check a member in. */
export async function manualCheckInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = manualCheckInSchema.safeParse({
    memberId: formData.get("memberId"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const member = await prisma.member.findUnique({
    where: { id: parsed.data.memberId },
  });
  if (!member) {
    return { error: "Member not found." };
  }
  if (member.status !== "ACTIVE") {
    return { error: "This member's account is inactive." };
  }

  const openAttendance = await prisma.attendance.findFirst({
    where: { memberId: member.id, checkOut: null },
  });
  if (openAttendance) {
    return { error: "This member is already checked in." };
  }

  const attendance = await prisma.attendance.create({
    data: {
      memberId: member.id,
      method: "MANUAL",
      markedById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CHECK_IN",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { memberId: member.id, method: "MANUAL" },
  });

  revalidatePath("/attendance");

  return { success: true, message: "Member checked in." };
}

/** Admin/Receptionist: close a member's open attendance record. */
export async function checkOutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = checkOutSchema.safeParse({
    attendanceId: formData.get("attendanceId"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: parsed.data.attendanceId },
  });
  if (!attendance) {
    return { error: "Attendance record not found." };
  }
  if (attendance.checkOut) {
    return { error: "This member is already checked out." };
  }

  await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOut: new Date() },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CHECK_OUT",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { memberId: attendance.memberId },
  });

  revalidatePath("/attendance");

  return { success: true, message: "Member checked out." };
}

/**
 * Admin/Receptionist: check a member in by scanning/typing their QR token.
 * Core action for both the /checkin page (manual entry + camera scan) and any
 * future QR-driven flows.
 */
export async function checkInByQrTokenAction(qrToken: string): Promise<ActionState> {
  const user = await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = qrCheckInSchema.safeParse({ qrToken });
  if (!parsed.success) {
    return { error: "Invalid QR code." };
  }

  const member = await prisma.member.findUnique({
    where: { qrToken: parsed.data.qrToken },
    include: {
      user: true,
      memberships: {
        where: { status: "ACTIVE" },
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
  });

  if (!member) {
    return { error: "Invalid QR code." };
  }
  if (member.status !== "ACTIVE") {
    return { error: "This member's account is inactive." };
  }

  const activeMembership = member.memberships[0];
  if (!activeMembership || activeMembership.endDate < new Date()) {
    return { error: "This member's membership has expired." };
  }

  const openAttendance = await prisma.attendance.findFirst({
    where: { memberId: member.id, checkOut: null },
  });
  if (openAttendance) {
    return { error: "Already checked in." };
  }

  const attendance = await prisma.attendance.create({
    data: {
      memberId: member.id,
      method: "QR",
      markedById: user.id,
    },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CHECK_IN",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { memberId: member.id, method: "QR" },
  });

  revalidatePath("/attendance");

  return {
    success: true,
    message: "Checked in.",
    data: { memberName: member.user.name, memberPhoto: member.photoUrl },
  };
}
