import { History } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { formatDateTime, titleCase } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { AuditLogFilters } from "./audit-log-filters";
import { AuditLogMetadata } from "./audit-log-metadata";

const ACTION_BADGE_VARIANT: Record<string, BadgeVariant> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "destructive",
  LOGIN: "primary",
  LOGOUT: "neutral",
  CHECK_IN: "success",
  CHECK_OUT: "neutral",
  OTHER: "neutral",
};

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

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search")?.trim();
  const entity = getParam(sp, "entity");
  const action = getParam(sp, "action");
  const from = getParam(sp, "from");
  const to = getParam(sp, "to");

  const gte = from ? startOfDayLocal(from) : undefined;
  const lte = to ? endOfDayLocal(to) : undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(search
      ? { user: { is: { OR: [{ name: { contains: search } }, { email: { contains: search } }] } } }
      : {}),
    ...(gte || lte ? { createdAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
  };

  const [total, logs, entityRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, username: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.auditLog.groupBy({ by: ["entity"], orderBy: { entity: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Audit Logs" description="A read-only trail of actions taken across the system." />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <SearchInput placeholder="Search by user name or email…" />
          <AuditLogFilters entities={entityRows.map((r) => r.entity)} />
        </div>
      </Card>

      {logs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No audit log entries"
          description="No activity matches the current filters."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell>
                  {log.user ? (
                    <div className="min-w-0">
                      <p className="truncate font-medium">{log.user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {log.user.email ?? `@${log.user.username}`}
                      </p>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">System</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={ACTION_BADGE_VARIANT[log.action] ?? "neutral"}>
                    {titleCase(log.action)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{log.entity}</p>
                  {log.entityId && (
                    <p className="truncate text-xs text-muted-foreground" title={log.entityId}>
                      {log.entityId}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <AuditLogMetadata raw={log.metadata} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination basePath="/audit-logs" searchParams={sp} page={page} pageSize={take} total={total} />
    </div>
  );
}
