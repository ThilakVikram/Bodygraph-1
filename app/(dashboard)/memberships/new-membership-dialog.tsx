"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createMembershipAction } from "@/lib/actions/memberships";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

export type MemberOption = { id: string; name: string; memberCode: string };
export type PlanOption = { id: string; name: string; price: number; durationDays: number };

export function NewMembershipDialog({
  members,
  plans,
  defaultMemberId,
  currency,
}: {
  members: MemberOption[];
  plans: PlanOption[];
  defaultMemberId?: string;
  currency: string;
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(createMembershipAction, initialActionState);
  useActionToast(state);

  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const selectedPlan = plans.find((p) => p.id === planId);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state]);

  return (
    <>
      <Button onClick={() => dialogRef.current?.open()}>
        <Plus className="h-4 w-4" /> New Membership
      </Button>
      <Dialog
        ref={dialogRef}
        title="New membership"
        description="Assign a plan to a member."
      >
        <form action={formAction} className="space-y-4">
          <Field label="Member" htmlFor="memberId" required error={state.fieldErrors?.memberId}>
            <Combobox
              name="memberId"
              value={memberId}
              onChange={setMemberId}
              placeholder="Search by name or member code…"
              invalid={!!state.fieldErrors?.memberId}
              options={members.map((m) => ({
                value: m.id,
                label: m.name,
                sublabel: m.memberCode,
              }))}
            />
          </Field>

          <Field label="Plan" htmlFor="planId" required error={state.fieldErrors?.planId}>
            <Select
              id="planId"
              name="planId"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              invalid={!!state.fieldErrors?.planId}
            >
              <option value="">Select a plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price, currency)} / {p.durationDays}d
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Start date"
              htmlFor="startDate"
              required
              error={state.fieldErrors?.startDate}
            >
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={today}
                invalid={!!state.fieldErrors?.startDate}
              />
            </Field>
            <Field
              label="Amount"
              htmlFor="amount"
              hint="Defaults to plan price."
              error={state.fieldErrors?.amount}
            >
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0}
                step="0.01"
                placeholder={selectedPlan ? selectedPlan.price.toFixed(2) : "0.00"}
                invalid={!!state.fieldErrors?.amount}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes" error={state.fieldErrors?.notes}>
            <Textarea id="notes" name="notes" rows={3} invalid={!!state.fieldErrors?.notes} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending} disabled={members.length === 0 || plans.length === 0}>
              Create membership
            </Button>
          </div>
          {(members.length === 0 || plans.length === 0) && (
            <p className="text-xs text-muted-foreground">
              {members.length === 0
                ? "No active members available. "
                : ""}
              {plans.length === 0 ? "No active membership plans available." : ""}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
