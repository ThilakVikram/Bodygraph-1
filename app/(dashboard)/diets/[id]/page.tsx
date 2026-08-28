import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DietPlanDetail } from "./diet-plan-detail";

export default async function DietPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ADMIN", "TRAINER", "MEMBER");

  const plan = await prisma.dietPlan.findUnique({
    where: { id },
    include: {
      member: { include: { user: true } },
      trainer: { include: { user: true } },
      items: { orderBy: [{ mealType: "asc" }, { order: "asc" }] },
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

  return (
    <div>
      <PageHeader
        title={plan.name}
        description={`${plan.member.user.name} · Trainer ${plan.trainer.user.name}`}
      />
      <DietPlanDetail
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
        items={plan.items.map((item) => ({
          id: item.id,
          mealType: item.mealType,
          foodName: item.foodName,
          quantity: item.quantity,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          timing: item.timing,
          instructions: item.instructions,
          order: item.order,
        }))}
        canEdit={canEdit}
      />
    </div>
  );
}
