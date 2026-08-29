"use client";

import { forwardRef, useActionState, useEffect, useImperativeHandle, useRef } from "react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adjustStockAction } from "@/lib/actions/inventory";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";

export type StockDialogHandle = { open: () => void; close: () => void };

/**
 * `trigger` renders a visible trigger inline. Pass `ref` instead (and omit
 * `trigger`) when this must be controlled from a <MenuItem> living inside a
 * <Menu> — render this component as a sibling of <Menu>, not a child of it.
 */
export const StockDialog = forwardRef<
  StockDialogHandle,
  {
    trigger?: (open: () => void) => React.ReactNode;
    type: "STOCK_IN" | "STOCK_OUT";
    itemId: string;
    itemName: string;
  }
>(function StockDialog({ trigger, type, itemId, itemName }, ref) {
  const dialogRef = useRef<DialogHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(adjustStockAction, initialActionState);
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

  const label = type === "STOCK_IN" ? "Stock in" : "Stock out";

  return (
    <>
      {trigger?.(() => dialogRef.current?.open())}
      <Dialog
        ref={dialogRef}
        title={`${label}: ${itemName}`}
        description={
          type === "STOCK_IN"
            ? "Record newly received stock."
            : "Record stock used, sold, or removed."
        }
      >
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="itemId" value={itemId} />
          <input type="hidden" name="type" value={type} />
          <Field label="Quantity" htmlFor="quantity" required error={state.fieldErrors?.quantity}>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              step={1}
              invalid={!!state.fieldErrors?.quantity}
            />
          </Field>
          <Field
            label="Reason"
            htmlFor="reason"
            hint="Optional note, e.g. supplier delivery or damaged goods."
            error={state.fieldErrors?.reason}
          >
            <Textarea id="reason" name="reason" rows={3} invalid={!!state.fieldErrors?.reason} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={pending}
              variant={type === "STOCK_OUT" ? "destructive" : "primary"}
            >
              {label}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
});
