import { AlertTriangle, Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireMemberProfile } from "@/lib/auth/dal";
import { syncExpiredMemberships } from "@/lib/actions/memberships";
import { MEMBERSHIP_EXPIRY_WINDOW_DAYS } from "@/lib/constants";
import { getCurrency } from "@/lib/settings";
import { cn, daysBetween, formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function MyMembershipPage() {
  const { member } = await requireMemberProfile();

  // Keep this member's membership statuses accurate before reading them.
  await syncExpiredMemberships();

  const [memberships, currency] = await Promise.all([
    prisma.membership.findMany({
      where: { memberId: member.id },
      include: { plan: true },
      orderBy: { startDate: "desc" },
    }),
    getCurrency(),
  ]);

  const current =
    memberships.find((m) => m.status === "ACTIVE") ??
    memberships.find((m) => m.status === "PENDING") ??
    memberships[0];
  const history = memberships.filter((m) => m.id !== current?.id);

  const now = new Date();
  const daysLeft = current ? daysBetween(now, current.endDate) : null;
  const isExpiringSoon =
    current?.status === "ACTIVE" &&
    daysLeft !== null &&
    daysLeft >= 0 &&
    daysLeft <= MEMBERSHIP_EXPIRY_WINDOW_DAYS;

  return (
    <div>
      <PageHeader title="My Membership" description="Your current plan and membership history." />

      {!current ? (
        <EmptyState
          icon={Layers}
          title="No membership yet"
          description="Visit the front desk to get set up with a membership plan."
        />
      ) : (
        <>
          {isExpiringSoon && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-bg px-4 py-3 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Your membership expires in {daysLeft} day{daysLeft === 1 ? "" : "s"}, on{" "}
                {formatDate(current.endDate)}. Visit the front desk to renew.
              </span>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle>{current.plan.name}</CardTitle>
                <StatusBadge status={current.status} />
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Start date
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{formatDate(current.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    End date
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{formatDate(current.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Amount paid
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{formatCurrency(current.amount, currency)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {current.status === "ACTIVE" ? "Time remaining" : "Status"}
                  </dt>
                  <dd
                    className={cn(
                      "mt-1 text-sm font-medium",
                      isExpiringSoon ? "text-warning" : "text-foreground",
                    )}
                  >
                    {current.status === "ACTIVE" && daysLeft !== null
                      ? daysLeft >= 0
                        ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                        : "Expired"
                      : current.status === "PENDING"
                        ? `Starts ${formatDate(current.startDate)}`
                        : "—"}
                  </dd>
                </div>
              </dl>
              {current.plan.description && (
                <p className="mt-4 text-sm text-muted-foreground">{current.plan.description}</p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Membership history</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No past memberships yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.plan.name}</TableCell>
                        <TableCell>{formatDate(m.startDate)}</TableCell>
                        <TableCell>{formatDate(m.endDate)}</TableCell>
                        <TableCell>{formatCurrency(m.amount, currency)}</TableCell>
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
        </>
      )}
    </div>
  );
}
