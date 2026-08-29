"use client";

import { forwardRef, useActionState, useEffect, useImperativeHandle, useRef } from "react";
import { Plus } from "lucide-react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createInventoryItemAction, updateInventoryItemAction } from "@/lib/actions/inventory";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";

type ItemLike = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  minStockLevel: number;
  supplier: string | null;
  costPrice: number | null;
  isActive: boolean;
};

export type ItemFormDialogHandle = { open: () => void; close: () => void };

/**
 * `trigger` renders a visible trigger inline. Pass `ref` instead (and omit
 * `trigger`) when this must be controlled from a <MenuItem> living inside a
 * <Menu> — render this component as a sibling of <Menu>, not a child of it.
 */
export const ItemFormDialog = forwardRef<
  ItemFormDialogHandle,
  {
    trigger?: (open: () => void) => React.ReactNode;
    mode: "create" | "edit";
    item?: ItemLike;
  }
>(function ItemFormDialog({ trigger, mode, item }, ref) {
  const dialogRef = useRef<DialogHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const action = mode === "create" ? createInventoryItemAction : updateInventoryItemAction;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state]);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.open(),
    close: () => dialogRef.current?.close(),
  }));

  const open = () => dialogRef.current?.open();

  return (
    <>
      {trigger ? (
        trigger(open)
      ) : !ref && mode === "create" ? (
        <Button onClick={open}>
          <Plus className="h-4 w-4" /> New Item
        </Button>
      ) : null}
      <Dialog
        ref={dialogRef}
        title={mode === "create" ? "New Inventory Item" : "Edit Inventory Item"}
        description={
          mode === "create"
            ? "Add a new item to track in inventory."
            : `Update details for ${item?.name}.`
        }
      >
        <form ref={formRef} action={formAction} className="space-y-4">
          {mode === "edit" && item && <input type="hidden" name="id" value={item.id} />}
          <Field label="Name" htmlFor="name" required error={state.fieldErrors?.name}>
            <Input
              id="name"
              name="name"
              defaultValue={item?.name}
              invalid={!!state.fieldErrors?.name}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" htmlFor="category" error={state.fieldErrors?.category}>
              <Input
                id="category"
                name="category"
                defaultValue={item?.category ?? ""}
                invalid={!!state.fieldErrors?.category}
              />
            </Field>
            <Field
              label="Unit"
              htmlFor="unit"
              hint="Defaults to pcs"
              error={state.fieldErrors?.unit}
            >
              <Input
                id="unit"
                name="unit"
                placeholder="pcs"
                defaultValue={item?.unit ?? ""}
                invalid={!!state.fieldErrors?.unit}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Minimum stock level"
              htmlFor="minStockLevel"
              error={state.fieldErrors?.minStockLevel}
            >
              <Input
                id="minStockLevel"
                name="minStockLevel"
                type="number"
                min={0}
                step={1}
                defaultValue={item?.minStockLevel ?? 0}
                invalid={!!state.fieldErrors?.minStockLevel}
              />
            </Field>
            <Field label="Cost price" htmlFor="costPrice" error={state.fieldErrors?.costPrice}>
              <Input
                id="costPrice"
                name="costPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={item?.costPrice ?? ""}
                invalid={!!state.fieldErrors?.costPrice}
              />
            </Field>
          </div>
          <Field label="Supplier" htmlFor="supplier" error={state.fieldErrors?.supplier}>
            <Input
              id="supplier"
              name="supplier"
              defaultValue={item?.supplier ?? ""}
              invalid={!!state.fieldErrors?.supplier}
            />
          </Field>
          {mode === "create" ? (
            <Field
              label="Initial quantity"
              htmlFor="initialQuantity"
              hint="Optional. Recorded as a Stock In transaction."
              error={state.fieldErrors?.initialQuantity}
            >
              <Input
                id="initialQuantity"
                name="initialQuantity"
                type="number"
                min={0}
                step={1}
                defaultValue={0}
                invalid={!!state.fieldErrors?.initialQuantity}
              />
            </Field>
          ) : (
            <div className="flex items-center gap-2">
              <Checkbox id="isActive" name="isActive" defaultChecked={item?.isActive ?? true} />
              <Label htmlFor="isActive" className="mb-0">
                Active
              </Label>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {mode === "create" ? "Create item" : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
});
