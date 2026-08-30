import { Download } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, titleCase } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartCard } from "@/components/charts/chart-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { AttendanceChart } from "@/components/charts/attendance-chart";
import { GrowthChart } from "@/components/charts/growth-chart";
import { TrainerPerformanceChart } from "@/components/charts/trainer-performance-chart";
import type {
  AttendanceSummary,
  MemberCounts,
  MembershipCounts,
  PaymentsBreakdown,
  getAttendanceDetail,
  getExpiredMemberships,
  getExpiringMemberships,
  getMemberGrowthSeries,
  getMembersDetail,
  getPaymentsDetail,
  getRevenueDetail,
} from "@/lib/reports";

const DETAIL_ROW_LIMIT = 50;

function ExportLink({ href }: { href: string }) {
  return (
    <a href={href} className={buttonVariants("outline", "sm")}>
      <Download className="h-4 w-4" /> Export CSV
    </a>
  );
}

function SectionHeader({
  title,
  description,
  exportHref,
}: {
  title: string;
  description: string;
  exportHref?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {exportHref && <ExportLink href={exportHref} />}
    </div>
  );
}

function TruncatedNote({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      Showing the {shown} most recent of {total} — use Export CSV for the full list.
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Revenue
// ─────────────────────────────────────────────────────────────────────────

export function RevenueSection({
  series,
  detail,
  exportHref,
  currency,
}: {
  series: { month: string; revenue: number }[];
  detail: Awaited<ReturnType<typeof getRevenueDetail>>;
  exportHref: string;
  currency: string;
}) {
  const totalInRange = detail.reduce((sum, p) => sum + p.amount, 0);
  const rows = detail.slice(0, DETAIL_ROW_LIMIT);

  return (
    <div className="space-y-6">
      <ChartCard title="Monthly revenue" description="Paid revenue, last 6 months.">
        <RevenueChart data={series} currency={currency} />
      </ChartCard>

      <div>
        <SectionHeader
          title="Payments (paid)"
          description={`Total collected in range: ${formatCurrency(totalInRange, currency)}`}
          exportHref={exportHref}
        />
        {rows.length === 0 ? (
          <EmptyState title="No paid payments in range" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                    <TableCell>{p.member.user.name}</TableCell>
                    <TableCell>{titleCase(p.method)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TruncatedNote shown={rows.length} total={detail.length} />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────────────────────

export function AttendanceSection({
  trend,
  summary,
  detail,
  exportHref,
}: {
  trend: { date: string; visits: number }[];
  summary: AttendanceSummary;
  detail: Awaited<ReturnType<typeof getAttendanceDetail>>;
  exportHref: string;
}) {
  const rows = detail.slice(0, DETAIL_ROW_LIMIT);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total visits (range)" value={summary.totalVisits} tone="primary" />
        <StatCard label="Unique members (range)" value={summary.uniqueMembers} tone="info" />
        <StatCard label="Avg visits / day" value={summary.avgPerDay} tone="success" />
      </div>

      <ChartCard title="Attendance trend" description="Check-ins, last 14 days.">
        <AttendanceChart data={trend} />
      </ChartCard>

      <div>
        <SectionHeader
          title="Check-ins"
          description="Attendance records in the selected range."
          exportHref={exportHref}
        />
        {rows.length === 0 ? (
          <EmptyState title="No attendance records in range" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.member.user.name}</TableCell>
                    <TableCell>{formatDateTime(a.checkIn)}</TableCell>
                    <TableCell>{a.checkOut ? formatDateTime(a.checkOut) : "—"}</TableCell>
                    <TableCell>{titleCase(a.method)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TruncatedNote shown={rows.length} total={detail.length} />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Members
// ─────────────────────────────────────────────────────────────────────────

export function MembersSection({
  counts,
  membershipGrowth,
  detail,
  exportHref,
}: {
  counts: MemberCounts;
  membershipGrowth: { month: string; memberships: number }[];
  detail: Awaited<ReturnType<typeof getMembersDetail>>;
  exportHref: string;
}) {
  const rows = detail.slice(0, DETAIL_ROW_LIMIT);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total members" value={counts.total} tone="primary" />
        <StatCard label="Active" value={counts.active} tone="success" />
        <StatCard label="Inactive" value={counts.inactive} tone="destructive" />
      </div>

      <ChartCard title="Membership growth" description="New memberships created, last 6 months.">
        <GrowthChart data={membershipGrowth} />
      </ChartCard>

      <div>
        <SectionHeader
          title="Members"
          description="Members who joined in the selected range."
          exportHref={exportHref}
        />
        {rows.length === 0 ? (
          <EmptyState title="No members joined in range" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.user.name}</TableCell>
                    <TableCell>{m.user.email ?? "—"}</TableCell>
                    <TableCell>{m.branch?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell>{formatDate(m.joinDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TruncatedNote shown={rows.length} total={detail.length} />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Memberships / Expired / Renewals
// ─────────────────────────────────────────────────────────────────────────

export function MembershipsSection({
  counts,
  expired,
  expiringSoon,
  exportHref,
}: {
  counts: MembershipCounts;
  expired: Awaited<ReturnType<typeof getExpiredMemberships>>;
  expiringSoon: Awaited<ReturnType<typeof getExpiringMemberships>>;
  exportHref: string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Total memberships" value={counts.total} tone="primary" />
        <StatCard label="Active" value={counts.active} tone="success" />
        <StatCard label="Expired (effective)" value={counts.expiredEffective} tone="destructive" />
        <StatCard label="Expiring soon" value={counts.expiringSoon} tone="warning" />
      </div>

      <div>
        <SectionHeader
          title="Memberships"
          description="Expired and soon-to-expire memberships, plus a full export of memberships ending in the selected range."
          exportHref={exportHref}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expiring soon</CardTitle>
          <CardDescription>Active memberships ending within the next few days.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expiringSoon.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No memberships expiring soon" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Ends</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringSoon.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.member.user.name}</TableCell>
                    <TableCell>{m.plan.name}</TableCell>
                    <TableCell>{formatDate(m.endDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expired</CardTitle>
          <CardDescription>
            Memberships whose end date has passed, regardless of stored status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {expired.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No expired memberships" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expired.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.member.user.name}</TableCell>
                    <TableCell>{m.plan.name}</TableCell>
                    <TableCell>{formatDate(m.endDate)}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────

export function PaymentsSection({
  breakdown,
  detail,
  exportHref,
  currency,
}: {
  breakdown: PaymentsBreakdown;
  detail: Awaited<ReturnType<typeof getPaymentsDetail>>;
  exportHref: string;
  currency: string;
}) {
  const rows = detail.slice(0, DETAIL_ROW_LIMIT);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By status</CardTitle>
            <CardDescription>
              Total collected: {formatCurrency(breakdown.totalCollected, currency)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {breakdown.byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments in range.</p>
            ) : (
              breakdown.byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <StatusBadge status={s.status} />
                  <span className="text-muted-foreground">
                    {s.count} · {formatCurrency(s.amount, currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By method</CardTitle>
            <CardDescription>Breakdown across payment methods.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {breakdown.byMethod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments in range.</p>
            ) : (
              breakdown.byMethod.map((m) => (
                <div key={m.method} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{titleCase(m.method)}</span>
                  <span className="text-muted-foreground">
                    {m.count} · {formatCurrency(m.amount, currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionHeader
          title="Payments"
          description="All payments (any status) in the selected range."
          exportHref={exportHref}
        />
        {rows.length === 0 ? (
          <EmptyState title="No payments in range" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber}</TableCell>
                    <TableCell>{p.member.user.name}</TableCell>
                    <TableCell>{titleCase(p.method)}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(p.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TruncatedNote shown={rows.length} total={detail.length} />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Trainer performance
// ─────────────────────────────────────────────────────────────────────────

export function TrainerPerformanceSection({
  data,
  exportHref,
}: {
  data: { trainer: string; activeMembers: number }[];
  exportHref: string;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trainer performance"
        description="Active members assigned per trainer."
        exportHref={exportHref}
      />
      <ChartCard title="Active members by trainer" className="mb-0">
        <TrainerPerformanceChart data={data} />
      </ChartCard>
      {data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trainer</TableHead>
              <TableHead className="text-right">Active members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => (
              <TableRow key={t.trainer}>
                <TableCell>{t.trainer}</TableCell>
                <TableCell className="text-right">{t.activeMembers}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Member growth
// ─────────────────────────────────────────────────────────────────────────

export function MemberGrowthSection({
  series,
  exportHref,
}: {
  series: Awaited<ReturnType<typeof getMemberGrowthSeries>>;
  exportHref: string;
}) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Member growth"
        description="New members joined per month, last 6 months."
        exportHref={exportHref}
      />
      <ChartCard title="New members" className="mb-0">
        <GrowthChart data={series.map((s) => ({ month: s.month, memberships: s.newMembers }))} />
      </ChartCard>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead className="text-right">New members</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {series.map((s) => (
            <TableRow key={s.month}>
              <TableCell>{s.month}</TableCell>
              <TableCell className="text-right">{s.newMembers}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
