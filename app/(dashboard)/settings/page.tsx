import { Building2, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { APP_NAME } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BranchFormDialog } from "./branch-form-dialog";
import { BranchRowActions } from "./branch-row-actions";

export default async function SettingsPage() {
  await requireRole("ADMIN");

  const [branches, branchStats] = await Promise.all([
    prisma.branch.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.branch.aggregate({ _count: { _all: true } }),
  ]);

  const branchCounts = new Map<string, { trainers: number; members: number }>();
  if (branches.length > 0) {
    const [trainerRows, memberRows] = await Promise.all([
      prisma.trainer.groupBy({ by: ["branchId"], _count: { _all: true } }),
      prisma.member.groupBy({ by: ["branchId"], _count: { _all: true } }),
    ]);
    for (const row of trainerRows) {
      if (!row.branchId) continue;
      const entry = branchCounts.get(row.branchId) ?? { trainers: 0, members: 0 };
      entry.trainers = row._count._all;
      branchCounts.set(row.branchId, entry);
    }
    for (const row of memberRows) {
      if (!row.branchId) continue;
      const entry = branchCounts.get(row.branchId) ?? { trainers: 0, members: 0 };
      entry.members = row._count._all;
      branchCounts.set(row.branchId, entry);
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage branch locations and view system info." />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Branches</h2>
          <p className="text-sm text-muted-foreground">
            Locations members and trainers can be assigned to.
          </p>
        </div>
        <BranchFormDialog mode="create" />
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add your first branch location."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Trainers</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => {
              const counts = branchCounts.get(b.id) ?? { trainers: 0, members: 0 };
              return (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.address ?? "—"}</TableCell>
                  <TableCell>{b.phone ?? "—"}</TableCell>
                  <TableCell>{counts.trainers}</TableCell>
                  <TableCell>{counts.members}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.isActive ? "ACTIVE" : "INACTIVE"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <BranchRowActions
                      branch={{
                        id: b.id,
                        name: b.name,
                        address: b.address,
                        phone: b.phone,
                        isActive: b.isActive,
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Card className="mt-8 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" /> About
          </CardTitle>
          <CardDescription>System information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Application</span>
            <span className="font-medium text-foreground">{APP_NAME}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium text-foreground">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Branches</span>
            <span className="font-medium text-foreground">{branchStats._count._all}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Today</span>
            <span className="font-medium text-foreground">{formatDate(new Date())}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
