import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { getCurrency } from "@/lib/settings";
import { formatCurrency, formatDate, titleCase } from "@/lib/utils";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants";
import {
  RecordPaymentDialog,
  type MemberOption,
  type MembershipOption,
} from "./record-payment-dialog";
import { PaymentFilters } from "./payment-filters";
import { PaymentStatusActions } from "./payment-status-actions";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("ADMIN", "RECEPTIONIST", "MEMBER");
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);

  if (user.role === "MEMBER") {
    const member = await prisma.member.findUnique({ where: { userId: user.id } });
    if (!member) redirect("/forbidden");

    const [payments, total, currency] = await Promise.all([
      prisma.payment.findMany({
        where: { memberId: member.id },
        include: { membership: { include: { plan: true } } },
        orderBy: { paymentDate: "desc" },
        skip,
        take,
      }),
      prisma.payment.count({ where: { memberId: member.id } }),
      getCurrency(),
    ]);

    return (
      <div>
        <PageHeader title="Payments" description="Your payment history and receipts." />
        {payments.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Payments recorded for your account will show up here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                  <TableCell>{p.membership?.plan.name ?? "—"}</TableCell>
                  <TableCell>{formatCurrency(p.amount, currency)}</TableCell>
                  <TableCell>{titleCase(p.method)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>{formatDate(p.paymentDate)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/receipts/${p.id}`}
                      className={buttonVariants("outline", "sm")}
                    >
                      View receipt
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-4">
          <Pagination basePath="/payments" searchParams={sp} page={page} pageSize={take} total={total} />
        </div>
      </div>
    );
  }

  // ── Admin / Receptionist ──────────────────────────────────────────────
  const status = getParam(sp, "status");
  const method = getParam(sp, "method");
  const dateFrom = getParam(sp, "dateFrom");
  const dateTo = getParam(sp, "dateTo");
  const q = getParam(sp, "q");
  const deepLinkMemberId = getParam(sp, "memberId");
  const deepLinkMembershipId = getParam(sp, "membershipId");

  const where: Prisma.PaymentWhereInput = {};
  if (status && (PAYMENT_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }
  if (method && (PAYMENT_METHODS as readonly string[]).includes(method)) {
    where.method = method;
  }
  if (dateFrom || dateTo) {
    where.paymentDate = {};
    if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }
  if (deepLinkMemberId) where.memberId = deepLinkMemberId;
  if (deepLinkMembershipId) where.membershipId = deepLinkMembershipId;
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q } },
      {
        member: {
          OR: [
            { memberCode: { contains: q } },
            { user: { name: { contains: q } } },
            { user: { email: { contains: q } } },
          ],
        },
      },
    ];
  }

  let dialogDefaultMemberId = deepLinkMemberId;
  const dialogDefaultMembershipId = deepLinkMembershipId;

  if (!dialogDefaultMemberId && dialogDefaultMembershipId) {
    const membership = await prisma.membership.findUnique({
      where: { id: dialogDefaultMembershipId },
      select: { memberId: true },
    });
    dialogDefaultMemberId = membership?.memberId;
  }

  const [payments, total, allMembers, initialMembershipRows, currency] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        member: { include: { user: true } },
        membership: { include: { plan: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip,
      take,
    }),
    prisma.payment.count({ where }),
    prisma.member.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    dialogDefaultMemberId
      ? prisma.membership.findMany({
          where: { memberId: dialogDefaultMemberId },
          include: { plan: true },
          orderBy: { startDate: "desc" },
        })
      : Promise.resolve([]),
    getCurrency(),
  ]);

  const memberOptions: MemberOption[] = allMembers.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email,
    memberCode: m.memberCode,
  }));

  const initialMemberships: MembershipOption[] = initialMembershipRows.map((m) => ({
    id: m.id,
    planName: m.plan.name,
    status: m.status,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    amount: m.amount,
  }));

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record and track member payments."
        actions={
          <RecordPaymentDialog
            members={memberOptions}
            defaultMemberId={dialogDefaultMemberId}
            defaultMembershipId={dialogDefaultMembershipId}
            initialMemberships={initialMemberships}
            autoOpen={Boolean(deepLinkMemberId || deepLinkMembershipId)}
          />
        }
      />

      <div className="mb-4">
        <PaymentFilters />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="No payments found"
          description="Try adjusting your filters, or record a new payment."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Member</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.invoiceNumber}</TableCell>
                <TableCell>
                  <div>{p.member.user.name}</div>
                  <div className="text-xs text-muted-foreground">{p.member.memberCode}</div>
                </TableCell>
                <TableCell>{p.membership?.plan.name ?? "—"}</TableCell>
                <TableCell>{formatCurrency(p.amount, currency)}</TableCell>
                <TableCell>{titleCase(p.method)}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell>{formatDate(p.paymentDate)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/receipts/${p.id}`}
                      className={buttonVariants("outline", "sm")}
                    >
                      Receipt
                    </Link>
                    <PaymentStatusActions paymentId={p.id} status={p.status} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-4">
        <Pagination basePath="/payments" searchParams={sp} page={page} pageSize={take} total={total} />
      </div>
    </div>
  );
}
