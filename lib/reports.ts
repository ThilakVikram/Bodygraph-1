import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_EXPIRY_WINDOW_DAYS } from "@/lib/constants";

const DAY_MS = 86_400_000;

export type DateRangeInput = { from?: string; to?: string };
export type DateRange = { from?: Date; to?: Date };

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/** Parses ?from=&to= query values (e.g. "2026-01-31") into a Date range covering full days. */
export function parseDateRange(input: DateRangeInput): DateRange {
  const from = input.from ? new Date(input.from) : undefined;
  const to = input.to ? new Date(input.to) : undefined;
  return {
    from: from && !Number.isNaN(from.getTime()) ? startOfDay(from) : undefined,
    to: to && !Number.isNaN(to.getTime()) ? endOfDay(to) : undefined,
  };
}

/** Builds a Prisma DateTime filter from a range, or undefined (no filter) when the range is empty. */
function dateFilter(range: DateRange): { gte?: Date; lte?: Date } | undefined {
  if (!range.from && !range.to) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (range.from) filter.gte = range.from;
  if (range.to) filter.lte = range.to;
  return filter;
}

// ─────────────────────────────────────────────────────────────────────────
// CSV helper
// ─────────────────────────────────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map((h) => escapeCsvField(h)).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsvField(String(cell))).join(","));
  }
  return lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Revenue / Payments
// ─────────────────────────────────────────────────────────────────────────

export async function getRevenueDetail(range: DateRange) {
  return prisma.payment.findMany({
    where: { status: "PAID", paymentDate: dateFilter(range) },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { paymentDate: "desc" },
  });
}

export async function getPaymentsDetail(range: DateRange) {
  return prisma.payment.findMany({
    where: { paymentDate: dateFilter(range) },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { paymentDate: "desc" },
  });
}

export type PaymentsBreakdown = {
  byStatus: { status: string; count: number; amount: number }[];
  byMethod: { method: string; count: number; amount: number }[];
  totalCollected: number;
};

export async function getPaymentsBreakdown(range: DateRange): Promise<PaymentsBreakdown> {
  const where = { paymentDate: dateFilter(range) };
  const [byStatus, byMethod, totalPaidAgg] = await Promise.all([
    prisma.payment.groupBy({ by: ["status"], where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["method"], where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { ...where, status: "PAID" }, _sum: { amount: true } }),
  ]);
  return {
    byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all, amount: r._sum.amount ?? 0 })),
    byMethod: byMethod.map((r) => ({ method: r.method, count: r._count._all, amount: r._sum.amount ?? 0 })),
    totalCollected: totalPaidAgg._sum.amount ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────────────────────

export async function getAttendanceDetail(range: DateRange) {
  return prisma.attendance.findMany({
    where: { checkIn: dateFilter(range) },
    include: { member: { include: { user: { select: { name: true } } } } },
    orderBy: { checkIn: "desc" },
  });
}

export type AttendanceSummary = { totalVisits: number; uniqueMembers: number; avgPerDay: number };

export async function getAttendanceSummary(range: DateRange): Promise<AttendanceSummary> {
  const records = await prisma.attendance.findMany({
    where: { checkIn: dateFilter(range) },
    select: { memberId: true, checkIn: true },
  });
  const uniqueMembers = new Set(records.map((r) => r.memberId)).size;
  const dayKeys = new Set(records.map((r) => startOfDay(r.checkIn).toDateString()));
  const days = dayKeys.size || 1;
  return {
    totalVisits: records.length,
    uniqueMembers,
    avgPerDay: Math.round((records.length / days) * 10) / 10,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Members
// ─────────────────────────────────────────────────────────────────────────

export type MemberCounts = { total: number; active: number; inactive: number };

export async function getMemberCounts(): Promise<MemberCounts> {
  const [total, active, inactive] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.member.count({ where: { status: "INACTIVE" } }),
  ]);
  return { total, active, inactive };
}

export async function getMembersDetail(range: DateRange) {
  return prisma.member.findMany({
    where: { joinDate: dateFilter(range) },
    include: { user: { select: { name: true, email: true } }, branch: { select: { name: true } } },
    orderBy: { joinDate: "desc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Memberships / Expired / Renewals
// ─────────────────────────────────────────────────────────────────────────

export type MembershipCounts = {
  total: number;
  active: number;
  expiredEffective: number;
  expiringSoon: number;
};

export async function getMembershipCounts(): Promise<MembershipCounts> {
  const now = new Date();
  const [total, active, expiredEffective, expiringSoon] = await Promise.all([
    prisma.membership.count(),
    prisma.membership.count({ where: { status: "ACTIVE" } }),
    prisma.membership.count({ where: { endDate: { lt: now } } }),
    prisma.membership.count({
      where: {
        status: "ACTIVE",
        endDate: { gte: now, lte: new Date(now.getTime() + MEMBERSHIP_EXPIRY_WINDOW_DAYS * DAY_MS) },
      },
    }),
  ]);
  return { total, active, expiredEffective, expiringSoon };
}

/** Memberships whose endDate has already passed — "effectively expired" regardless of stored status. */
export async function getExpiredMemberships(limit = 25) {
  return prisma.membership.findMany({
    where: { endDate: { lt: new Date() } },
    include: { member: { include: { user: { select: { name: true } } } }, plan: { select: { name: true } } },
    orderBy: { endDate: "desc" },
    take: limit,
  });
}

/** Active memberships ending within the expiry window — candidates for renewal. */
export async function getExpiringMemberships(windowDays = MEMBERSHIP_EXPIRY_WINDOW_DAYS, limit = 25) {
  const now = new Date();
  return prisma.membership.findMany({
    where: { status: "ACTIVE", endDate: { gte: now, lte: new Date(now.getTime() + windowDays * DAY_MS) } },
    include: { member: { include: { user: { select: { name: true } } } }, plan: { select: { name: true } } },
    orderBy: { endDate: "asc" },
    take: limit,
  });
}

export async function getMembershipsDetail(range: DateRange) {
  return prisma.membership.findMany({
    where: { endDate: dateFilter(range) },
    include: { member: { include: { user: { select: { name: true } } } }, plan: { select: { name: true } } },
    orderBy: { endDate: "desc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Member growth (new members per month, bucketed from Member.joinDate)
// ─────────────────────────────────────────────────────────────────────────

export type MemberGrowthPoint = { month: string; newMembers: number };

export async function getMemberGrowthSeries(months = 6): Promise<MemberGrowthPoint[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const members = await prisma.member.findMany({
    where: { joinDate: { gte: start } },
    select: { joinDate: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    buckets.set(monthKey(d), 0);
  }
  for (const m of members) {
    const key = monthKey(m.joinDate);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([key, count]) => {
    const [y, m] = key.split("-").map(Number);
    return { month: monthLabel(new Date(y, m - 1, 1)), newMembers: count };
  });
}
