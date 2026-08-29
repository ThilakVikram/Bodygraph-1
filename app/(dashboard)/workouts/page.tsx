import Link from "next/link";
import { requireRole, requireMemberProfile, requireTrainerProfile } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { parsePagination, getParam, type SearchParams } from "@/lib/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { WorkoutPlansClient } from "./workout-plans-client";
import type { Prisma } from "@/generated/prisma/client";

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("ADMIN", "TRAINER", "MEMBER");
  const sp = await searchParams;
  const search = getParam(sp, "search") ?? "";
  const status = getParam(sp, "status") ?? "";
  const { page, take, skip } = parsePagination(sp);

  const where: Prisma.WorkoutPlanWhereInput = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { member: { user: { name: { contains: search } } } },
    ];
  }

  let members: { id: string; name: string }[] = [];
  let trainers: { id: string; name: string }[] = [];
  const canCreate = user.role === "ADMIN" || user.role === "TRAINER";

  if (user.role === "MEMBER") {
    const { member } = await requireMemberProfile();
    where.memberId = member.id;
  } else if (user.role === "TRAINER") {
    const { trainer } = await requireTrainerProfile();
    where.trainerId = trainer.id;
    const myMembers = await prisma.member.findMany({
      where: { trainerId: trainer.id },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });
    members = myMembers.map((m) => ({ id: m.id, name: m.user.name }));
  } else {
    const [allMembers, allTrainers] = await Promise.all([
      prisma.member.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
      prisma.trainer.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    ]);
    members = allMembers.map((m) => ({ id: m.id, name: m.user.name }));
    trainers = allTrainers.map((t) => ({ id: t.id, name: t.user.name }));
  }

  const [plans, total] = await Promise.all([
    prisma.workoutPlan.findMany({
      where,
      include: { member: { include: { user: true } }, trainer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.workoutPlan.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="Workout Plans"
        description="Assign and track member workout programs."
        actions={
          canCreate ? (
            <Link href="/workouts/exercises" className={buttonVariants("outline")}>
              Exercise Library
            </Link>
          ) : undefined
        }
      />
      <WorkoutPlansClient
        plans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate ? p.endDate.toISOString() : null,
          memberName: p.member.user.name,
          trainerName: p.trainer.user.name,
        }))}
        searchParams={sp}
        page={page}
        pageSize={take}
        total={total}
        canCreate={canCreate}
        isAdmin={user.role === "ADMIN"}
        members={members}
        trainers={trainers}
      />
    </div>
  );
}
