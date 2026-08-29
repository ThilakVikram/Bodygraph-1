import { requireRole } from "@/lib/auth/dal";
import { getParam, type SearchParams } from "@/lib/pagination";
import {
  parseDateRange,
  getRevenueDetail,
  getAttendanceDetail,
  getAttendanceSummary,
  getMemberCounts,
  getMembersDetail,
  getMembershipCounts,
  getExpiredMemberships,
  getExpiringMemberships,
  getPaymentsBreakdown,
  getPaymentsDetail,
  getMemberGrowthSeries,
} from "@/lib/reports";
import {
  getMonthlyRevenueSeries,
  getAttendanceTrend,
  getMembershipGrowthSeries,
  getTrainerPerformance,
} from "@/lib/analytics";
import { getCurrency } from "@/lib/settings";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs } from "@/components/ui/tabs";
import { DateRangeFilter } from "./date-range-filter";
import {
  RevenueSection,
  AttendanceSection,
  MembersSection,
  MembershipsSection,
  PaymentsSection,
  TrainerPerformanceSection,
  MemberGrowthSection,
} from "./report-sections";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const from = getParam(sp, "from");
  const to = getParam(sp, "to");
  const range = parseDateRange({ from, to });

  const qsParams = new URLSearchParams();
  if (from) qsParams.set("from", from);
  if (to) qsParams.set("to", to);
  const qs = qsParams.toString();
  const withQs = (path: string) => (qs ? `${path}?${qs}` : path);

  const [
    revenueSeries,
    revenueDetail,
    attendanceTrend,
    attendanceSummary,
    attendanceDetail,
    memberCounts,
    membershipGrowthSeries,
    membersDetail,
    membershipCounts,
    expiredMemberships,
    expiringMemberships,
    paymentsBreakdown,
    paymentsDetail,
    trainerPerformance,
    memberGrowthSeries,
    currency,
  ] = await Promise.all([
    getMonthlyRevenueSeries(6),
    getRevenueDetail(range),
    getAttendanceTrend(14),
    getAttendanceSummary(range),
    getAttendanceDetail(range),
    getMemberCounts(),
    getMembershipGrowthSeries(6),
    getMembersDetail(range),
    getMembershipCounts(),
    getExpiredMemberships(),
    getExpiringMemberships(),
    getPaymentsBreakdown(range),
    getPaymentsDetail(range),
    getTrainerPerformance(),
    getMemberGrowthSeries(6),
    getCurrency(),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Revenue, attendance, membership and trainer reports across the gym."
      />

      <DateRangeFilter />

      <Tabs
        tabs={[
          {
            value: "revenue",
            label: "Revenue",
            content: (
              <RevenueSection
                series={revenueSeries}
                detail={revenueDetail}
                exportHref={withQs("/api/reports/revenue")}
                currency={currency}
              />
            ),
          },
          {
            value: "attendance",
            label: "Attendance",
            content: (
              <AttendanceSection
                trend={attendanceTrend}
                summary={attendanceSummary}
                detail={attendanceDetail}
                exportHref={withQs("/api/reports/attendance")}
              />
            ),
          },
          {
            value: "members",
            label: "Members",
            content: (
              <MembersSection
                counts={memberCounts}
                membershipGrowth={membershipGrowthSeries}
                detail={membersDetail}
                exportHref={withQs("/api/reports/members")}
              />
            ),
          },
          {
            value: "memberships",
            label: "Memberships",
            content: (
              <MembershipsSection
                counts={membershipCounts}
                expired={expiredMemberships}
                expiringSoon={expiringMemberships}
                exportHref={withQs("/api/reports/memberships")}
              />
            ),
          },
          {
            value: "payments",
            label: "Payments",
            content: (
              <PaymentsSection
                breakdown={paymentsBreakdown}
                detail={paymentsDetail}
                exportHref={withQs("/api/reports/payments")}
                currency={currency}
              />
            ),
          },
          {
            value: "trainers",
            label: "Trainer Performance",
            content: (
              <TrainerPerformanceSection
                data={trainerPerformance}
                exportHref="/api/reports/trainer-performance"
              />
            ),
          },
          {
            value: "growth",
            label: "Member Growth",
            content: (
              <MemberGrowthSection series={memberGrowthSeries} exportHref="/api/reports/member-growth" />
            ),
          },
        ]}
      />
    </div>
  );
}
