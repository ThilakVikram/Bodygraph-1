import Link from "next/link";
import { UserCheck, AlertTriangle, CalendarCheck, Clock, QrCode, UserPlus } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { AttendanceChart } from "@/components/charts/attendance-chart";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatCurrency, formatTime } from "@/lib/utils";
import { getDashboardStats, getAttendanceTrend } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function ReceptionistDashboard({ userName }: { userName: string }) {
  const [stats, attendance, recentCheckIns] = await Promise.all([
    getDashboardStats(),
    getAttendanceTrend(),
    prisma.attendance.findMany({
      orderBy: { checkIn: "desc" },
      take: 6,
      include: { member: { include: { user: { select: { name: true, avatarUrl: true } } } } },
    }),
  ]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back, {userName.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Front desk overview for today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/checkin" className={buttonVariants("primary", "md")}>
            <QrCode className="h-4 w-4" /> Check-in
          </Link>
          <Link href="/members/new" className={buttonVariants("outline", "md")}>
            <UserPlus className="h-4 w-4" /> New member
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Members" value={stats.activeMembers} icon={UserCheck} tone="success" />
        <StatCard label="Today's Attendance" value={stats.todayAttendance} icon={CalendarCheck} tone="info" />
        <StatCard label="Expiring Soon" value={stats.expiringMemberships} icon={AlertTriangle} tone="warning" />
        <StatCard
          label="Pending Payments"
          value={`${stats.pendingPayments} (${formatCurrency(stats.pendingPaymentsAmount)})`}
          icon={Clock}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Attendance Trend" description="Check-ins over the last 14 days">
          <AttendanceChart data={attendance} />
        </ChartCard>
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-base font-semibold text-foreground">Recent check-ins</h3>
            {recentCheckIns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet today.</p>
            ) : (
              <ul className="space-y-3">
                {recentCheckIns.map((a) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <Avatar name={a.member.user.name} src={a.member.user.avatarUrl} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.member.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.method === "QR" ? "QR check-in" : "Manual check-in"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatTime(a.checkIn)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
