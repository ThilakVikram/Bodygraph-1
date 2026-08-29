"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Ban, RotateCcw } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { initialActionState } from "@/lib/actions/types";
import { toggleBranchActiveAction } from "@/lib/actions/settings";
import { BranchFormDialog, type BranchFormDialogHandle, type BranchFormValues } from "./branch-form-dialog";

export function BranchRowActions({ branch }: { branch: BranchFormValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const editRef = useRef<BranchFormDialogHandle>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function handleToggleActive() {
    const formData = new FormData();
    formData.set("id", branch.id);
    const result = await toggleBranchActiveAction(initialActionState, formData);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
      router.refresh();
    }
  }

  return (
    <>
      <Menu
        trigger={
          <Button variant="ghost" size="icon" type="button" aria-label="Row actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        }
      >
        <MenuItem onClick={() => editRef.current?.open()}>
          <Pencil className="h-4 w-4" /> Edit
        </MenuItem>
        <MenuItem destructive={branch.isActive} onClick={() => confirmRef.current?.open()}>
          {branch.isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          {branch.isActive ? "Deactivate" : "Reactivate"}
        </MenuItem>
      </Menu>
      {/*
        Both rendered as siblings of <Menu>, not nested inside it: Menu
        unmounts its children as soon as one is clicked, which would remove
        these dialogs' native <dialog> elements from the DOM before they ever show.
      */}
      <BranchFormDialog ref={editRef} mode="edit" branch={branch} />
      <ConfirmDialog
        ref={confirmRef}
        title={branch.isActive ? "Deactivate branch?" : "Reactivate branch?"}
        description={
          branch.isActive
            ? `${branch.name} will be hidden from new member/trainer assignment. Existing assignments are unaffected.`
            : `${branch.name} will be available again for new assignments.`
        }
        confirmLabel={branch.isActive ? "Deactivate" : "Reactivate"}
        variant={branch.isActive ? "destructive" : "primary"}
        onConfirm={handleToggleActive}
      />
    </>
  );
}
