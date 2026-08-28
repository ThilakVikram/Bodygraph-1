import Link from "next/link";
import { Layers } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { syncExpiredMemberships } from "@/lib/actions/memberships";
import { parsePagination, getParam, buildPageHref, type SearchParams } from "@/lib/pagination";
import { MEMBERSHIP_EXPIRY_WINDOW_DAYS } from "@/lib/constants";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { NewMembershipDialog } from "./new-membership-dialog";

const STATUS_TABS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
] as const;

export default async function MembershipsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN", "RECEPTIONIST");

  // Read-time correction: flip stale ACTIVE rows whose endDate has passed to EXPIRED
  // so this list (and anything else reading Membership) stays consistent.
  await syncExpiredMemberships();

  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search")?.trim() ?? "";
  const status = getParam(sp, "status") ?? "ALL";
  const memberId = getParam(sp, "memberId");

  const where: Prisma.MembershipWhereInput = {};
  if (memberId) where.memberId = memberId;
  if (search) {
    where.member = {
      OR: [{ user: { name: { contains: search } } }, { memberCode: { contains: search } }],
    };
  }

  if (status === "EXPIRING_SOON") {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + MEMBERSHIP_EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    where.status = "ACTIVE";
    where.endDate = { gte: now, lte: windowEnd };
  } else if (status !== "ALL") {
    where.status = status;
  }

  const [memberships, total, filteredMember, membersRaw, plans] = await Promise.all([
    prisma.membership.findMany({
      where,
      include: { member: { include: { user: true } }, plan: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.membership.count({ where }),
    memberId
      ? prisma.member.findUnique({ where: { id: memberId }, include: { user: true } })
      : Promise.resolve(null),
    prisma.member.findMany({ where: { status: "ACTIVE" }, include: { user: true } }),
    prisma.membershipPlan.findMany({ where: { isActive: true } }),
  ]);

  const members = membersRaw
    .map((m) => ({ id: m.id, name: m.user.name, memberCode: m.memberCode }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const planOptions = plans
    .map((p) => ({ id: p.id, name: p.name, price: p.price, durationDays: p.durationDays }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Memberships"
        description="Assign, renew, and track member plan subscriptions."
        actions={
          <NewMembershipDialog
            members={members}
            plans={planOptions}
            defaultMemberId={memberId}
          />
        }
      />

      {filteredMember && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Filtered to</span>
          <span className="font-medium text-foreground">{filteredMember.user.name}</span>
          <Link href="/memberships" className="ml-auto text-primary hover:underline">
            Clear
          </Link>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildPageHref("/memberships", sp, {
                status: tab.value === "ALL" ? undefined : tab.value,
                page: undefined,
              })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                status === tab.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <SearchInput placeholder="Search by member name or code…" />
      </div>

      {memberships.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No memberships found"
          description="Try adjusting your filters, or create a new membership."
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{m.member.user.name}</div>
                    <div className="text-xs text-muted-foreground">{m.member.memberCode}</div>
                  </TableCell>
                  <TableCell>{m.plan.name}</TableCell>
                  <TableCell>{formatDate(m.startDate)}</TableCell>
                  <TableCell>{formatDate(m.endDate)}</TableCell>
                  <TableCell>{formatCurrency(m.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/memberships/${m.id}`} className={buttonVariants("outline", "sm")}>
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            basePath="/memberships"
            searchParams={sp}
            page={page}
            pageSize={take}
            total={total}
          />
        </>
      )}
    </div>
  );
}
