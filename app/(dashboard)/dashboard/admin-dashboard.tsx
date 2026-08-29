import { Users, UserCheck, Layers, AlertTriangle, CalendarCheck, DollarSign, Clock, UserPlus } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { ChartCard } from "@/components/charts/chart-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { AttendanceChart } from "@/components/charts/attendance-chart";
import { GrowthChart } from "@/components/charts/growth-chart";
import { StatusPieChart } from "@/components/charts/status-pie-chart";
import { TrainerPerformanceChart } from "@/components/charts/trainer-performance-chart";
import { PeakHoursChart } from "@/components/charts/peak-hours-chart";
import { getCurrency } from "@/lib/settings";
import { formatCurrency } from "@/lib/utils";
import {
  getDashboardStats,
  getMonthlyRevenueSeries,
  getAttendanceTrend,
  getMembershipGrowthSeries,
  getMembershipStatusBreakdown,
  getTrainerPerformance,
  getPeakHours,
} from "@/lib/analytics";

export async function AdminDashboard({ userName }: { userName: string }) {
  const [stats, revenue, attendance, growth, statusBreakdown, trainerPerf, peakHours, currency] =
    await Promise.all([
      getDashboardStats(),
      getMonthlyRevenueSeries(),
      getAttendanceTrend(),
      getMembershipGrowthSeries(),
      getMembershipStatusBreakdown(),
      getTrainerPerformance(),
      getPeakHours(),
      getCurrency(),
    ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {userName.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening at your gym today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={stats.totalMembers} icon={Users} tone="primary" />
        <StatCard label="Active Members" value={stats.activeMembers} icon={UserCheck} tone="success" />
        <StatCard label="Active Memberships" value={stats.activeMemberships} icon={Layers} tone="info" />
        <StatCard label="Expiring Soon" value={stats.expiringMemberships} icon={AlertTriangle} tone="warning" />
        <StatCard label="Today's Attendance" value={stats.todayAttendance} icon={CalendarCheck} tone="info" />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue, currency)} icon={DollarSign} tone="success" />
        <StatCard
          label="Pending Payments"
          value={`${stats.pendingPayments} (${formatCurrency(stats.pendingPaymentsAmount, currency)})`}
          icon={Clock}
          tone="warning"
        />
        <StatCard label="New Members (This Month)" value={stats.newMembersThisMonth} icon={UserPlus} tone="primary" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly Revenue" description="Paid revenue over the last 6 months">
          <RevenueChart data={revenue} currency={currency} />
        </ChartCard>
        <ChartCard title="Attendance Trend" description="Check-ins over the last 14 days">
          <AttendanceChart data={attendance} />
        </ChartCard>
        <ChartCard title="Membership Growth" description="New memberships per month">
          <GrowthChart data={growth} />
        </ChartCard>
        <ChartCard title="Membership Status" description="Current membership breakdown">
          <StatusPieChart data={statusBreakdown} />
        </ChartCard>
        <ChartCard title="Trainer Performance" description="Active members per trainer">
          <TrainerPerformanceChart data={trainerPerf} />
        </ChartCard>
        <ChartCard title="Peak Gym Hours" description="Check-ins by hour, last 30 days">
          <PeakHoursChart data={peakHours} />
        </ChartCard>
      </div>
    </div>
  );
}
