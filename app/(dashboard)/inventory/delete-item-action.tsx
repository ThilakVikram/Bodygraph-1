"use client";

import { forwardRef } from "react";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-provider";
import { deleteInventoryItemAction } from "@/lib/actions/inventory";
import { initialActionState } from "@/lib/actions/types";

export type DeleteItemActionHandle = ConfirmDialogHandle;

/**
 * Pass `ref` (and omit `trigger`) when this must be controlled from a
 * <MenuItem> living inside a <Menu> — render this component as a sibling of
 * <Menu>, not a child of it, since Menu unmounts its children as soon as one
 * is clicked.
 */
export const DeleteItemAction = forwardRef<
  DeleteItemActionHandle,
  { id: string; name: string; trigger?: (open: () => void) => React.ReactNode }
>(function DeleteItemAction({ id, name, trigger }, ref) {
  const { toast } = useToast();

  async function handleConfirm() {
    const formData = new FormData();
    formData.set("id", id);
    const result = await deleteInventoryItemAction(initialActionState, formData);
    if (result.error) {
      toast({ title: "Couldn't delete item", description: result.error, variant: "error" });
    } else {
      toast({
        title: "Success",
        description: result.message ?? "Item deleted.",
        variant: "success",
      });
    }
  }

  return (
    <ConfirmDialog
      ref={ref}
      trigger={trigger}
      title="Delete inventory item?"
      description={`This will permanently delete "${name}". Items with stock transaction history can't be deleted — deactivate instead via Edit.`}
      confirmLabel="Delete"
      onConfirm={handleConfirm}
    />
  );
});
