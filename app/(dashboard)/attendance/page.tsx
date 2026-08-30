import Link from "next/link";
import { CalendarCheck, CalendarDays, Monitor, QrCode, UserCheck } from "lucide-react";
import { requireUser, requireMemberProfile, requireTrainerProfile } from "@/lib/auth/dal";
import { closeStaleOpenAttendances } from "@/lib/actions/attendance";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { AttendanceFilters } from "./attendance-filters";
import { CheckInDialog } from "./checkin-dialog";
import { CheckOutButton } from "./checkout-button";

function startOfDayLocal(dateStr: string): Date | undefined {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function endOfDayLocal(dateStr: string): Date | undefined {
  const start = startOfDayLocal(dateStr);
  if (!start) return undefined;
  return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  await closeStaleOpenAttendances();
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search")?.trim();
  const from = getParam(sp, "from");
  const to = getParam(sp, "to");
  const trainerIdParam = getParam(sp, "trainerId");

  let scopeWhere: Prisma.AttendanceWhereInput = {};
  let trainersForFilter: { id: string; name: string }[] | undefined;
  let membersForCheckIn: { id: string; memberCode: string; name: string; status: string }[] = [];
  const canManage = user.role === "ADMIN" || user.role === "RECEPTIONIST";
  const showMemberColumn = user.role !== "MEMBER";

  if (user.role === "MEMBER") {
    const { member } = await requireMemberProfile();
    scopeWhere = { memberId: member.id };
  } else if (user.role === "TRAINER") {
    const { trainer } = await requireTrainerProfile();
    scopeWhere = { member: { trainerId: trainer.id } };
  } else {
    // ADMIN / RECEPTIONIST — full access
    if (trainerIdParam) {
      scopeWhere = { member: { trainerId: trainerIdParam } };
    }
    const [trainerRows, memberRows] = await Promise.all([
      prisma.trainer.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { user: { name: "asc" } },
      }),
      prisma.member.findMany({
        where: { status: "ACTIVE" },
        include: { user: { select: { name: true } } },
        orderBy: { memberCode: "asc" },
        take: 500,
      }),
    ]);
    trainersForFilter = trainerRows.map((t) => ({ id: t.id, name: t.user.name }));
    membersForCheckIn = memberRows.map((m) => ({
      id: m.id,
      memberCode: m.memberCode,
      name: m.user.name,
      status: m.status,
    }));
  }

  const searchWhere: Prisma.AttendanceWhereInput | undefined = search
    ? {
        member: {
          OR: [
            { memberCode: { contains: search } },
            { user: { name: { contains: search } } },
          ],
        },
      }
    : undefined;

  const gte = from ? startOfDayLocal(from) : undefined;
  const lte = to ? endOfDayLocal(to) : undefined;

  const where: Prisma.AttendanceWhereInput = {
    AND: [
      scopeWhere,
      ...(searchWhere ? [searchWhere] : []),
      ...(gte || lte ? [{ checkIn: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } }] : []),
    ],
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [total, attendances, todayCount, monthCount, currentlyIn] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true, avatarUrl: true } } } },
        markedBy: { select: { name: true } },
      },
      orderBy: { checkIn: "desc" },
      skip,
      take,
    }),
    prisma.attendance.count({ where: { ...scopeWhere, checkIn: { gte: todayStart, lte: todayEnd } } }),
    prisma.attendance.count({ where: { ...scopeWhere, checkIn: { gte: monthStart } } }),
    prisma.attendance.count({ where: { ...scopeWhere, checkOut: null } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={
          user.role === "MEMBER"
            ? "Your check-in history."
            : user.role === "TRAINER"
              ? "Attendance for your assigned members."
              : "Track and manage member check-ins."
        }
        actions={
          canManage ? (
            <>
              <Link
                href="/kiosk"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants("outline", "md")}
              >
                <Monitor className="h-4 w-4" /> Open Check-in Kiosk
              </Link>
              <Link href="/checkin" className={buttonVariants("outline", "md")}>
                <QrCode className="h-4 w-4" /> Scan QR
              </Link>
              <CheckInDialog members={membersForCheckIn} />
            </>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today" value={todayCount} icon={CalendarCheck} tone="info" />
        <StatCard label="This Month" value={monthCount} icon={CalendarDays} tone="primary" />
        <StatCard label="Currently Checked In" value={currentlyIn} icon={UserCheck} tone="success" />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {user.role !== "MEMBER" && (
            <SearchInput placeholder="Search member name or code…" />
          )}
          <AttendanceFilters trainers={trainersForFilter} />
        </div>
      </Card>

      {attendances.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No attendance records"
          description="No check-ins match the current filters."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {showMemberColumn && <TableHead>Member</TableHead>}
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              {showMemberColumn && <TableHead>Marked by</TableHead>}
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendances.map((a) => (
              <TableRow key={a.id}>
                {showMemberColumn && (
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={a.member.user.name} src={a.member.user.avatarUrl} size={32} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{a.member.user.name}</p>
                        <p className="text-xs text-muted-foreground">{a.member.memberCode}</p>
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell>{formatDateTime(a.checkIn)}</TableCell>
                <TableCell>
                  {a.checkOut ? (
                    a.checkOutUnknown ? (
                      <span className="text-muted-foreground">Unknown</span>
                    ) : (
                      formatDateTime(a.checkOut)
                    )
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={a.method === "QR" ? "info" : a.method === "KIOSK" ? "success" : "neutral"}
                  >
                    {a.method}
                  </Badge>
                </TableCell>
                <TableCell>
                  {!a.checkOut ? (
                    <Badge variant="success">Checked in</Badge>
                  ) : a.checkOutUnknown ? (
                    <Badge variant="warning">Checkout unknown</Badge>
                  ) : (
                    <Badge variant="neutral">Checked out</Badge>
                  )}
                </TableCell>
                {showMemberColumn && <TableCell>{a.markedBy?.name ?? "—"}</TableCell>}
                {canManage && (
                  <TableCell className="text-right">
                    {!a.checkOut && <CheckOutButton attendanceId={a.id} />}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination basePath="/attendance" searchParams={sp} page={page} pageSize={take} total={total} />
    </div>
  );
}
