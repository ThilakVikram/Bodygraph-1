import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Users, UserCheck, Dumbbell } from "lucide-react";
import { TrainerDetailActions } from "./trainer-detail-actions";

export default async function TrainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("ADMIN");

  const trainer = await prisma.trainer.findUnique({
    where: { id },
    include: { user: true, branch: true },
  });

  if (!trainer) notFound();

  const [totalMembers, activeMembers, activeWorkoutPlans, assignedMembers] = await Promise.all([
    prisma.member.count({ where: { trainerId: trainer.id } }),
    prisma.member.count({ where: { trainerId: trainer.id, status: "ACTIVE" } }),
    prisma.workoutPlan.count({ where: { trainerId: trainer.id, status: "ACTIVE" } }),
    prisma.member.findMany({
      where: { trainerId: trainer.id },
      include: { user: true },
      orderBy: { joinDate: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={trainer.user.name}
        description={trainer.specialization ?? "Trainer"}
        actions={<TrainerDetailActions trainerId={trainer.id} isActive={trainer.isActive} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar name={trainer.user.name} src={trainer.user.avatarUrl} size={96} />
            <div>
              <p className="text-base font-semibold text-foreground">{trainer.user.name}</p>
              <p className="text-sm text-muted-foreground">{trainer.user.email ?? `@${trainer.user.username}`}</p>
            </div>
            <StatusBadge status={trainer.isActive ? "ACTIVE" : "INACTIVE"} />
            <div className="w-full space-y-2 border-t border-border pt-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium text-foreground">{trainer.user.phone ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium text-foreground">{trainer.branch?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Experience</span>
                <span className="font-medium text-foreground">
                  {trainer.experienceYears ?? 0} {trainer.experienceYears === 1 ? "year" : "years"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="font-medium text-foreground">{formatDate(trainer.joinDate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {trainer.bio && (
            <Card>
              <CardHeader>
                <CardTitle>Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{trainer.bio}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Total Members" value={totalMembers} icon={Users} tone="primary" />
            <StatCard label="Active Members" value={activeMembers} icon={UserCheck} tone="success" />
            <StatCard label="Active Workout Plans" value={activeWorkoutPlans} icon={Dumbbell} tone="info" />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Assigned members</CardTitle>
                <CardDescription>Members currently coached by this trainer.</CardDescription>
              </div>
              <Link href={`/members?trainerId=${trainer.id}`} className={buttonVariants("outline", "sm")}>
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {assignedMembers.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No members assigned yet." />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Link href={`/members/${member.id}`} className="flex items-center gap-3">
                            <Avatar name={member.user.name} src={member.user.avatarUrl} size={28} />
                            <span className="text-foreground">{member.user.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={member.status} />
                        </TableCell>
                        <TableCell>{formatDate(member.joinDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
