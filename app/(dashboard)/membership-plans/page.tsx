import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanFormDialog } from "./plan-form-dialog";
import { PlanCard } from "./plan-card";

export function parsePlanFeatures(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f): f is string => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export default async function MembershipPlansPage() {
  const user = await requireRole("ADMIN", "RECEPTIONIST", "TRAINER");
  const isAdmin = user.role === "ADMIN";

  const plans = await prisma.membershipPlan.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  const membershipCounts = new Map<string, number>();
  if (isAdmin && plans.length > 0) {
    const rows = await prisma.membership.findMany({
      where: { planId: { in: plans.map((p) => p.id) } },
      select: { planId: true },
    });
    for (const row of rows) {
      membershipCounts.set(row.planId, (membershipCounts.get(row.planId) ?? 0) + 1);
    }
  }

  return (
    <div>
      <PageHeader
        title="Membership Plans"
        description={
          isAdmin
            ? "Create and manage the plans members can subscribe to."
            : "Plans available for members to subscribe to."
        }
        actions={isAdmin ? <PlanFormDialog mode="create" /> : undefined}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No membership plans yet"
          description={
            isAdmin
              ? "Create your first plan to start assigning memberships."
              : "No membership plans have been created yet."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                name: plan.name,
                description: plan.description,
                durationDays: plan.durationDays,
                price: plan.price,
                features: parsePlanFeatures(plan.features),
                isActive: plan.isActive,
              }}
              isAdmin={isAdmin}
              hasMemberships={(membershipCounts.get(plan.id) ?? 0) > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
