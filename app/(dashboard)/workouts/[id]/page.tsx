import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { WorkoutPlanDetail } from "./workout-plan-detail";

export default async function WorkoutPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ADMIN", "TRAINER", "MEMBER");

  const plan = await prisma.workoutPlan.findUnique({
    where: { id },
    include: {
      member: { include: { user: true } },
      trainer: { include: { user: true } },
      exercises: { include: { exercise: true }, orderBy: [{ dayOfWeek: "asc" }, { order: "asc" }] },
    },
  });
  if (!plan) notFound();

  let canEdit = false;
  if (user.role === "ADMIN") {
    canEdit = true;
  } else if (user.role === "TRAINER") {
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.id } });
    canEdit = !!trainer && trainer.id === plan.trainerId;
  } else {
    const member = await prisma.member.findUnique({ where: { userId: user.id } });
    if (!member || member.id !== plan.memberId) redirect("/forbidden");
  }

  const exerciseLibrary = canEdit ? await prisma.exercise.findMany({ orderBy: { name: "asc" } }) : [];

  return (
    <div>
      <PageHeader
        title={plan.name}
        description={`${plan.member.user.name} · Trainer ${plan.trainer.user.name}`}
      />
      <WorkoutPlanDetail
        plan={{
          id: plan.id,
          name: plan.name,
          description: plan.description,
          status: plan.status,
          startDate: plan.startDate.toISOString(),
          endDate: plan.endDate ? plan.endDate.toISOString() : null,
          memberName: plan.member.user.name,
          trainerName: plan.trainer.user.name,
        }}
        exercises={plan.exercises.map((we) => ({
          id: we.id,
          exerciseId: we.exerciseId,
          exerciseName: we.exercise.name,
          dayOfWeek: we.dayOfWeek,
          sets: we.sets,
          reps: we.reps,
          weight: we.weight,
          restSeconds: we.restSeconds,
          durationMinutes: we.durationMinutes,
          order: we.order,
          notes: we.notes,
        }))}
        exerciseLibrary={exerciseLibrary.map((e) => ({ id: e.id, name: e.name }))}
        canEdit={canEdit}
      />
    </div>
  );
}
