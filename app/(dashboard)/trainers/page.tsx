import Link from "next/link";
import { UserCog } from "lucide-react";
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
import { getParam, parsePagination, type SearchParams } from "@/lib/pagination";
import { TrainerFormDialog } from "./trainer-form-dialog";
import { TrainerFilters } from "./trainer-filters";
import { TrainerRowActions } from "./trainer-row-actions";

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole("ADMIN");

  const sp = await searchParams;
  const { page, take, skip } = parsePagination(sp);
  const search = getParam(sp, "search");
  const status = getParam(sp, "status");
  const sort = getParam(sp, "sort") ?? "newest";

  const where: Prisma.TrainerWhereInput = {
    ...(status ? { isActive: status === "ACTIVE" } : {}),
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
            { specialization: { contains: search } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.TrainerOrderByWithRelationInput =
    sort === "oldest"
      ? { joinDate: "asc" }
      : sort === "name_asc"
        ? { user: { name: "asc" } }
        : sort === "name_desc"
          ? { user: { name: "desc" } }
          : { joinDate: "desc" };

  const [trainers, total, branches] = await Promise.all([
    prisma.trainer.findMany({
      where,
      include: { user: true, branch: true, _count: { select: { members: true } } },
      orderBy,
      skip,
      take,
    }),
    prisma.trainer.count({ where }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Trainers"
        description="Manage trainer accounts, specializations and assignments."
        actions={<TrainerFormDialog branches={branches.map((b) => ({ id: b.id, label: b.name }))} />}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchInput placeholder="Search by name, email or specialization…" />
        <TrainerFilters />
      </div>

      {trainers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title="No trainers found"
          description={
            search || status
              ? "Try adjusting your search or filters."
              : "Get started by adding your first trainer."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trainer</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.map((trainer) => (
              <TableRow key={trainer.id}>
                <TableCell>
                  <Link href={`/trainers/${trainer.id}`} className="flex items-center gap-3">
                    <Avatar name={trainer.user.name} src={trainer.user.avatarUrl} size={32} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{trainer.user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{trainer.user.email}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>{trainer.specialization ?? "—"}</TableCell>
                <TableCell>{trainer.branch?.name ?? "—"}</TableCell>
                <TableCell>{trainer._count.members}</TableCell>
                <TableCell>
                  <StatusBadge status={trainer.isActive ? "ACTIVE" : "INACTIVE"} />
                </TableCell>
                <TableCell className="text-right">
                  <TrainerRowActions trainerId={trainer.id} isActive={trainer.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="mt-4">
        <Pagination basePath="/trainers" searchParams={sp} page={page} pageSize={take} total={total} />
      </div>
    </div>
  );
}
