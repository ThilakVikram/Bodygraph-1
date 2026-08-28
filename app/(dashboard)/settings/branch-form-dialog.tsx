"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createBranchAction, updateBranchAction } from "@/lib/actions/settings";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type BranchFormValues = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
};

export type BranchFormDialogHandle = { open: () => void; close: () => void };

/**
 * `trigger` renders a visible trigger inline. Pass `ref` instead (and omit
 * `trigger`) when this must be controlled from a <MenuItem> living inside a
 * <Menu> — render this component as a sibling of <Menu>, not a child of it,
 * since Menu unmounts its children (and this dialog) as soon as one is clicked.
 */
export const BranchFormDialog = forwardRef<
  BranchFormDialogHandle,
  {
    mode: "create" | "edit";
    branch?: BranchFormValues;
    trigger?: (open: () => void) => React.ReactNode;
  }
>(function BranchFormDialog({ mode, branch, trigger }, ref) {
  const dialogRef = useRef<DialogHandle>(null);
  const action = mode === "create" ? createBranchAction : updateBranchAction;
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
          <Plus className="h-4 w-4" /> New Branch
        </Button>
      ) : null}
      <Dialog
        ref={dialogRef}
        title={mode === "create" ? "New branch" : "Edit branch"}
        description="Branch locations members and trainers can be assigned to."
      >
        <form action={formAction} className="space-y-4">
          {mode === "edit" && branch && <input type="hidden" name="id" value={branch.id} />}

          <Field label="Name" htmlFor="branch-name" required error={state.fieldErrors?.name}>
            <Input
              id="branch-name"
              name="name"
              defaultValue={branch?.name}
              invalid={!!state.fieldErrors?.name}
            />
          </Field>

          <Field label="Address" htmlFor="branch-address" error={state.fieldErrors?.address}>
            <Input
              id="branch-address"
              name="address"
              defaultValue={branch?.address ?? ""}
              invalid={!!state.fieldErrors?.address}
            />
          </Field>

          <Field label="Phone" htmlFor="branch-phone" error={state.fieldErrors?.phone}>
            <Input
              id="branch-phone"
              name="phone"
              defaultValue={branch?.phone ?? ""}
              invalid={!!state.fieldErrors?.phone}
            />
          </Field>

          <div className="flex items-center gap-2">
            <Checkbox id="branch-isActive" name="isActive" defaultChecked={branch?.isActive ?? true} />
            <Label htmlFor="branch-isActive" className="mb-0">
              Active
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {mode === "create" ? "Create branch" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
});
