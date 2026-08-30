"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { daysBetween } from "@/lib/utils";
import {
  manualCheckInSchema,
  checkOutSchema,
  qrCheckInSchema,
  kioskLookupSchema,
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

const STALE_CHECKIN_MS = 24 * 60 * 60 * 1000;

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Lazy correction (same idea as syncExpiredMemberships): an attendance row
 * left open for more than a day is a forgotten checkout, not someone still
 * on-site. Close it with checkOutUnknown so the record is honest about not
 * knowing the real checkout time, instead of leaving it open forever — which
 * would otherwise make a later kiosk visit look like a checkout for a
 * session from a different day.
 */
export async function closeStaleOpenAttendances(): Promise<void> {
  const staleOpen = await prisma.attendance.findMany({
    where: { checkOut: null, checkIn: { lt: new Date(Date.now() - STALE_CHECKIN_MS) } },
  });
  await Promise.all(
    staleOpen.map((a) =>
      prisma.attendance.update({
        where: { id: a.id },
        data: { checkOut: endOfDay(a.checkIn), checkOutUnknown: true },
      }),
    ),
  );
}

function summarizeMembership(
  membership: { status: string; endDate: Date; plan: { name: string } } | undefined,
) {
  const daysLeft = membership ? daysBetween(new Date(), membership.endDate) : null;
  return {
    membershipStatus: membership?.status ?? null,
    membershipPlanName: membership?.plan.name ?? null,
    membershipEndDate: membership?.endDate.toISOString() ?? null,
    daysLeft,
  };
}

/**
 * Self-service kiosk, step 1: a member identifies themselves (member ID or
 * phone — no password). If they have no open attendance, this checks them
 * in immediately. If they do, it does NOT check them out on the spot —
 * kioskConfirmCheckOutAction does that, after the kiosk UI confirms with
 * them. Requires an ADMIN/RECEPTIONIST session to have loaded the kiosk page
 * at all, but the resulting record is the member's own action, not staff
 * performing it on their behalf — markedById is left null.
 */
export async function kioskLookupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "RECEPTIONIST");

  const parsed = kioskLookupSchema.safeParse({
    identifier: formData.get("identifier"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await closeStaleOpenAttendances();

  const raw = parsed.data.identifier.trim();
  const digitsOnly = raw.replace(/\D/g, "");
  const normalizedCode = digitsOnly ? `MEM-${digitsOnly}` : null;

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { memberCode: raw.toUpperCase() },
        ...(normalizedCode ? [{ memberCode: normalizedCode }] : []),
        { user: { phone: raw } },
        { user: { username: raw.toLowerCase() } },
      ],
    },
    include: {
      user: true,
      memberships: {
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!member) {
    return { error: "No member found with that member ID or phone number." };
  }
  if (member.status !== "ACTIVE") {
    return { error: `${member.user.name}'s account is inactive. Please see the front desk.` };
  }

  const membershipSummary = summarizeMembership(member.memberships[0]);
  const openAttendance = await prisma.attendance.findFirst({
    where: { memberId: member.id, checkOut: null },
  });

  if (openAttendance) {
    return {
      success: true,
      message: "Already checked in",
      data: {
        needsCheckoutConfirm: true,
        attendanceId: openAttendance.id,
        checkInAt: openAttendance.checkIn.toISOString(),
        memberName: member.user.name,
        memberCode: member.memberCode,
        photoUrl: member.photoUrl,
        ...membershipSummary,
      },
    };
  }

  const attendance = await prisma.attendance.create({
    data: { memberId: member.id, method: "KIOSK" },
  });

  await writeAuditLog({
    userId: null,
    action: "CHECK_IN",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { memberId: member.id, method: "KIOSK" },
  });

  revalidatePath("/attendance");

  return {
    success: true,
    message: "Checked in",
    data: {
      action: "IN",
      memberName: member.user.name,
      memberCode: member.memberCode,
      photoUrl: member.photoUrl,
      ...membershipSummary,
    },
  };
}

/** Self-service kiosk, step 2: the member confirmed they want to check out. */
export async function kioskConfirmCheckOutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole("ADMIN", "RECEPTIONIST");

  const attendanceId = String(formData.get("attendanceId") ?? "");
  if (!attendanceId) return { error: "Missing attendance record." };

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      member: {
        include: {
          user: true,
          memberships: { orderBy: { endDate: "desc" }, take: 1, include: { plan: true } },
        },
      },
    },
  });
  if (!attendance) return { error: "Attendance record not found." };
  if (attendance.checkOut) return { error: "This member is already checked out." };

  await prisma.attendance.update({
    where: { id: attendance.id },
    data: { checkOut: new Date() },
  });

  await writeAuditLog({
    userId: null,
    action: "CHECK_OUT",
    entity: "Attendance",
    entityId: attendance.id,
    metadata: { memberId: attendance.memberId, method: "KIOSK" },
  });

  revalidatePath("/attendance");

  return {
    success: true,
    message: "Checked out",
    data: {
      action: "OUT",
      memberName: attendance.member.user.name,
      memberCode: attendance.member.memberCode,
      photoUrl: attendance.member.photoUrl,
      ...summarizeMembership(attendance.member.memberships[0]),
    },
  };
}
