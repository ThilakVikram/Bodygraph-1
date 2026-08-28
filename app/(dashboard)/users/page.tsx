import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/dal";
import { ROLE_LABELS, type Role } from "@/lib/auth/constants";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar } from "@/components/ui/avatar";
import { NewStaffUserDialog } from "./new-staff-user-dialog";
import { UserRowActions } from "./user-row-actions";
import { UserFilters } from "./user-filters";

const ROLE_BADGE_VARIANT: Record<Role, BadgeVariant> = {
  ADMIN: "primary",
  RECEPTIONIST: "info",
  TRAINER: "warning",
  MEMBER: "neutral",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const admin = await requireRole("ADMIN");
  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search")?.trim();
  const role = getParam(sp, "role");
  const status = getParam(sp, "status");

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(status === "active" ? { isActive: true } : status === "inactive" ? { isActive: false } : {}),
    ...(search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage staff accounts and view a directory of every account in the system."
        actions={<NewStaffUserDialog />}
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder="Search name or email…" />
          <UserFilters />
        </div>
      </Card>

      {users.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No users found"
          description="No accounts match the current filters."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} src={u.avatarUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {u.name}
                        {u.id === admin.id && (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[u.role as Role] ?? "neutral"}>
                    {ROLE_LABELS[u.role as Role] ?? u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} />
                </TableCell>
                <TableCell>{formatDateTime(u.lastLoginAt)}</TableCell>
                <TableCell>{formatDateTime(u.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <UserRowActions
                    user={{
                      id: u.id,
                      name: u.name,
                      phone: u.phone,
                      role: u.role,
                      isActive: u.isActive,
                    }}
                    currentUserId={admin.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Pagination basePath="/users" searchParams={sp} page={page} pageSize={take} total={total} />
    </div>
  );
}
