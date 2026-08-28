import Link from "next/link";
import { UserPlus } from "lucide-react";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { formatDate } from "@/lib/utils";
import { getParam, parsePagination, type SearchParams } from "@/lib/pagination";
import { MemberFormDialog } from "./member-form-dialog";
import { MemberFilters } from "./member-filters";
import { MemberRowActions } from "./member-row-actions";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("ADMIN", "RECEPTIONIST", "TRAINER");
  const isStaff = user.role === "ADMIN" || user.role === "RECEPTIONIST";

  let ownTrainerId: string | null = null;
  if (user.role === "TRAINER") {
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
    ownTrainerId = trainer?.id ?? null;
  }

  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search");
  const status = getParam(sp, "status");
  const trainerFilter = getParam(sp, "trainerId");
  const sort = getParam(sp, "sort") ?? "newest";

  const where: Prisma.MemberWhereInput = {
    ...(ownTrainerId
      ? { trainerId: ownTrainerId }
      : trainerFilter
        ? { trainerId: trainerFilter }
        : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { memberCode: { contains: search } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.MemberOrderByWithRelationInput =
    sort === "oldest"
      ? { joinDate: "asc" }
      : sort === "name_asc"
        ? { user: { name: "asc" } }
        : sort === "name_desc"
          ? { user: { name: "desc" } }
          : { joinDate: "desc" };

  const [members, total, branches, trainers] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { user: true, branch: true, trainer: { include: { user: true } } },
      orderBy,
      skip,
      take,
    }),
    prisma.member.count({ where }),
    isStaff ? prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isStaff
      ? prisma.trainer.findMany({
          where: { isActive: true },
          include: { user: true },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);

  const branchOptions = branches.map((b) => ({ id: b.id, label: b.name }));
  const trainerOptions = trainers.map((t) => ({ id: t.id, label: t.user.name }));

  return (
    <div>
      <PageHeader
        title={user.role === "TRAINER" ? "My Members" : "Members"}
        description={
          user.role === "TRAINER"
            ? "Members assigned to you."
            : "Manage gym members, their memberships and profiles."
        }
        actions={isStaff ? <MemberFormDialog branches={branchOptions} trainers={trainerOptions} /> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Search by name, email or member code…" />
        <MemberFilters trainerOptions={trainerOptions} showTrainerFilter={isStaff} />
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No members found"
          description={
            search || status || trainerFilter
              ? "Try adjusting your search or filters."
              : isStaff
                ? "Get started by adding your first member."
                : "No members are assigned to you yet."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              {isStaff && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                    <Avatar name={member.user.name} src={member.user.avatarUrl ?? member.photoUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{member.user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{member.memberCode}</TableCell>
                <TableCell>{member.trainer?.user.name ?? "—"}</TableCell>
                <TableCell>{member.branch?.name ?? "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={member.status} />
                </TableCell>
                <TableCell>{formatDate(member.joinDate)}</TableCell>
                {isStaff && (
                  <TableCell className="text-right">
                    <MemberRowActions memberId={member.id} status={member.status} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-4">
        <Pagination basePath="/members" searchParams={sp} page={page} pageSize={take} total={total} />
      </div>
    </div>
  );
}
