"use client";

import { useTransition } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import {
  togglePlanActiveAction,
  deleteMembershipPlanAction,
} from "@/lib/actions/membership-plans";
import { initialActionState } from "@/lib/actions/types";
import { useToast } from "@/components/ui/toast-provider";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/utils";
import { PlanFormDialog, type PlanFormValues } from "./plan-form-dialog";

export function PlanCard({
  plan,
  isAdmin,
  hasMemberships,
  currency,
}: {
  plan: PlanFormValues;
  isAdmin: boolean;
  hasMemberships: boolean;
  currency: string;
}) {
  const { toast } = useToast();
  const [togglePending, startToggle] = useTransition();

  function handleToggle() {
    startToggle(async () => {
      const fd = new FormData();
      fd.set("id", plan.id);
      const result = await togglePlanActiveAction(initialActionState, fd);
      if (result.error) {
        toast({ title: "Something went wrong", description: result.error, variant: "error" });
      } else if (result.message) {
        toast({ title: "Success", description: result.message, variant: "success" });
      }
    });
  }

  async function handleDelete() {
    const fd = new FormData();
    fd.set("id", plan.id);
    const result = await deleteMembershipPlanAction(initialActionState, fd);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle>{plan.name}</CardTitle>
            {plan.description && (
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <Badge variant={plan.isActive ? "success" : "neutral"}>
            {plan.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {formatCurrency(plan.price, currency)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {plan.durationDays} day{plan.durationDays === 1 ? "" : "s"}
          </span>
        </div>
        {plan.features.length > 0 && (
          <ul className="space-y-1.5">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {isAdmin && (
        <CardFooter className="flex-wrap gap-2">
          <PlanFormDialog
            mode="edit"
            plan={plan}
            trigger={(open) => (
              <Button variant="outline" size="sm" onClick={open}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          />
          <Button variant="outline" size="sm" onClick={handleToggle} loading={togglePending}>
            {plan.isActive ? "Deactivate" : "Activate"}
          </Button>
          {hasMemberships ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              title="This plan has memberships and can't be deleted."
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <ConfirmDialog
              trigger={(open) => (
                <Button variant="destructive" size="sm" onClick={open}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
              title="Delete membership plan?"
              description={`This will permanently delete "${plan.name}". This can't be undone.`}
              confirmLabel="Delete"
              onConfirm={handleDelete}
            />
          )}
        </CardFooter>
      )}
    </Card>
  );
}
