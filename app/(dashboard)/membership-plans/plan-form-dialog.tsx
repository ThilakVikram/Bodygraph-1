"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Plus } from "lucide-react";
import { useActionState } from "react";
import {
  createMembershipPlanAction,
  updateMembershipPlanAction,
} from "@/lib/actions/membership-plans";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type PlanFormValues = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  price: number;
  features: string[];
  isActive: boolean;
};

export type PlanFormDialogHandle = { open: () => void; close: () => void };

/**
 * `trigger` renders a visible trigger inline. Pass `ref` instead (and omit
 * `trigger`) when this must be controlled from a <MenuItem> living inside a
 * <Menu> — render this component as a sibling of <Menu>, not a child of it.
 */
export const PlanFormDialog = forwardRef<
  PlanFormDialogHandle,
  {
    mode: "create" | "edit";
    plan?: PlanFormValues;
    trigger?: (open: () => void) => React.ReactNode;
  }
>(function PlanFormDialog({ mode, plan, trigger }, ref) {
  const dialogRef = useRef<DialogHandle>(null);
  const action = mode === "create" ? createMembershipPlanAction : updateMembershipPlanAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state]);

  const open = () => dialogRef.current?.open();

  useImperativeHandle(ref, () => ({ open, close: () => dialogRef.current?.close() }));

  return (
    <>
      {trigger ? (
        trigger(open)
      ) : !ref ? (
        <Button onClick={open}>
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      ) : null}
      <Dialog
        ref={dialogRef}
        title={mode === "create" ? "New membership plan" : "Edit membership plan"}
        description="Define what members get and how much it costs."
      >
        <form action={formAction} className="space-y-4">
          {mode === "edit" && plan && <input type="hidden" name="id" value={plan.id} />}

          <Field label="Name" htmlFor="name" required error={state.fieldErrors?.name}>
            <Input
              id="name"
              name="name"
              defaultValue={plan?.name}
              invalid={!!state.fieldErrors?.name}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={state.fieldErrors?.description}>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={plan?.description ?? ""}
              invalid={!!state.fieldErrors?.description}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Duration (days)"
              htmlFor="durationDays"
              required
              error={state.fieldErrors?.durationDays}
            >
              <Input
                id="durationDays"
                name="durationDays"
                type="number"
                min={1}
                step={1}
                defaultValue={plan?.durationDays ?? 30}
                invalid={!!state.fieldErrors?.durationDays}
              />
            </Field>
            <Field label="Price" htmlFor="price" required error={state.fieldErrors?.price}>
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={plan?.price ?? 0}
                invalid={!!state.fieldErrors?.price}
              />
            </Field>
          </div>

          <Field
            label="Features"
            htmlFor="features"
            hint="One per line, or comma-separated."
            error={state.fieldErrors?.features}
          >
            <Textarea
              id="features"
              name="features"
              rows={4}
              defaultValue={plan?.features.join("\n") ?? ""}
              invalid={!!state.fieldErrors?.features}
            />
          </Field>

          <div className="flex items-center gap-2">
            <Checkbox id="isActive" name="isActive" defaultChecked={plan?.isActive ?? true} />
            <Label htmlFor="isActive">Active (visible for new memberships)</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {mode === "create" ? "Create plan" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
});
