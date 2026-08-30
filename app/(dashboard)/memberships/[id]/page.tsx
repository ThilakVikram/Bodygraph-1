import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { syncExpiredMemberships } from "@/lib/actions/memberships";
import { getCurrency } from "@/lib/settings";
import { computePaymentStatus, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipDetailActions } from "./membership-detail-actions";

export default async function MembershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("ADMIN", "RECEPTIONIST");
  await syncExpiredMemberships();

  const { id } = await params;

  const membership = await prisma.membership.findUnique({
    where: { id },
    include: { member: { include: { user: true } }, plan: true },
  });
  if (!membership) notFound();

  const [payments, activePlansRaw, currency] = await Promise.all([
    prisma.payment.findMany({
      where: { membershipId: membership.id },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.membershipPlan.findMany({ where: { isActive: true } }),
    getCurrency(),
  ]);

  const paymentStatus = computePaymentStatus(membership.amount, payments);

  const planOptionsRaw = activePlansRaw.some((p) => p.id === membership.planId)
    ? activePlansRaw
    : [membership.plan, ...activePlansRaw];
  const planOptions = planOptionsRaw
    .map((p) => ({ id: p.id, name: p.name, price: p.price, durationDays: p.durationDays }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <Link
        href="/memberships"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to memberships
      </Link>

      <PageHeader
        title={membership.member.user.name}
        description={`${membership.plan.name} membership`}
        actions={
          <MembershipDetailActions
            membershipId={membership.id}
            memberId={membership.memberId}
            memberName={membership.member.user.name}
            status={membership.status}
            currentPlanId={membership.planId}
            plans={planOptions}
            currency={currency}
            isAdmin={user.role === "ADMIN"}
          />
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Membership details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={membership.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Plan
                </dt>
                <dd className="mt-1 text-sm text-foreground">{membership.plan.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Start date
                </dt>
                <dd className="mt-1 text-sm text-foreground">{formatDate(membership.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  End date
                </dt>
                <dd className="mt-1 text-sm text-foreground">{formatDate(membership.endDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Amount
                </dt>
                <dd className="mt-1 text-sm text-foreground">{formatCurrency(membership.amount, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Payment Status
                </dt>
                <dd className="mt-1">
                  <StatusBadge status={paymentStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatDateTime(membership.createdAt)}
                </dd>
              </div>
              {membership.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">{membership.notes}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">{membership.member.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {membership.member.user.email ?? `@${membership.member.user.username}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral">{membership.member.memberCode}</Badge>
              <StatusBadge status={membership.member.status} />
            </div>
            <Link
              href={`/memberships?memberId=${membership.memberId}`}
              className="inline-block text-sm text-primary hover:underline"
            >
              View all memberships for this member
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Linked payments</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments recorded for this membership" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>{formatCurrency(payment.amount, currency)}</TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
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
