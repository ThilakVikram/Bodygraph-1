import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_EXPIRY_WINDOW_DAYS } from "@/lib/constants";

const DAY_MS = 86_400_000;

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
function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type DashboardStats = {
  totalMembers: number;
  activeMembers: number;
  activeMemberships: number;
  expiringMemberships: number;
  todayAttendance: number;
  monthlyRevenue: number;
  pendingPayments: number;
  pendingPaymentsAmount: number;
  newMembersThisMonth: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const expiryWindowEnd = new Date(now.getTime() + MEMBERSHIP_EXPIRY_WINDOW_DAYS * DAY_MS);

  const [
    totalMembers,
    activeMembers,
    activeMemberships,
    expiringMemberships,
    todayAttendance,
    monthlyRevenueAgg,
    pendingPaymentsAgg,
    newMembersThisMonth,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.membership.count({ where: { status: "ACTIVE" } }),
    prisma.membership.count({
      where: { status: "ACTIVE", endDate: { gte: now, lte: expiryWindowEnd } },
    }),
    prisma.attendance.count({ where: { checkIn: { gte: todayStart, lte: todayEnd } } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paymentDate: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.member.count({ where: { joinDate: { gte: monthStart } } }),
  ]);

  return {
    totalMembers,
    activeMembers,
    activeMemberships,
    expiringMemberships,
    todayAttendance,
    monthlyRevenue: monthlyRevenueAgg._sum.amount ?? 0,
    pendingPayments: pendingPaymentsAgg._count ?? 0,
    pendingPaymentsAmount: pendingPaymentsAgg._sum.amount ?? 0,
    newMembersThisMonth,
  };
}

export async function getMonthlyRevenueSeries(months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const payments = await prisma.payment.findMany({
    where: { status: "PAID", paymentDate: { gte: start } },
    select: { amount: true, paymentDate: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    buckets.set(monthKey(d), 0);
  }
  for (const p of payments) {
    const key = monthKey(p.paymentDate);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
  }

  return Array.from(buckets.entries()).map(([key, revenue]) => {
    const [y, m] = key.split("-").map(Number);
    return { month: monthLabel(new Date(y, m - 1, 1)), revenue: Math.round(revenue * 100) / 100 };
  });
}

export async function getAttendanceTrend(days = 14) {
  const now = new Date();
  const start = startOfDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  const records = await prisma.attendance.findMany({
    where: { checkIn: { gte: start } },
    select: { checkIn: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(new Date(start.getTime() + i * DAY_MS));
    buckets.set(d.toDateString(), 0);
  }
  for (const r of records) {
    const key = startOfDay(r.checkIn).toDateString();
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([key, count]) => ({
    date: dayLabel(new Date(key)),
    visits: count,
  }));
}

export async function getMembershipGrowthSeries(months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const memberships = await prisma.membership.findMany({
    where: { createdAt: { gte: start } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    buckets.set(monthKey(d), 0);
  }
  for (const m of memberships) {
    const key = monthKey(m.createdAt);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([key, count]) => {
    const [y, m] = key.split("-").map(Number);
    return { month: monthLabel(new Date(y, m - 1, 1)), memberships: count };
  });
}

export async function getMembershipStatusBreakdown() {
  const rows = await prisma.membership.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

export async function getTrainerPerformance() {
  const trainers = await prisma.trainer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      user: { select: { name: true } },
      _count: { select: { members: true } },
    },
  });
  return trainers
    .map((t) => ({ trainer: t.user.name, activeMembers: t._count.members }))
    .sort((a, b) => b.activeMembers - a.activeMembers);
}

export async function getPeakHours() {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const records = await prisma.attendance.findMany({
    where: { checkIn: { gte: since } },
    select: { checkIn: true },
  });

  const buckets = new Array(24).fill(0) as number[];
  for (const r of records) {
    buckets[r.checkIn.getHours()] += 1;
  }

  return buckets.map((count, hour) => ({
    hour: new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", { hour: "numeric" }),
    visits: count,
  }));
}
