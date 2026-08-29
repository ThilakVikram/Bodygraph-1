"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, Ban, RotateCcw } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { initialActionState } from "@/lib/actions/types";
import { deactivateTrainerAction, reactivateTrainerAction } from "@/lib/actions/trainers";

export function TrainerRowActions({ trainerId, isActive }: { trainerId: string; isActive: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function handleToggle() {
    const formData = new FormData();
    formData.set("trainerId", trainerId);
    const action = isActive ? deactivateTrainerAction : reactivateTrainerAction;
    const result = await action(initialActionState, formData);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
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
        <MenuItem onClick={() => router.push(`/trainers/${trainerId}`)}>
          <Eye className="h-4 w-4" /> View
        </MenuItem>
        <MenuItem onClick={() => router.push(`/trainers/${trainerId}/edit`)}>
          <Pencil className="h-4 w-4" /> Edit
        </MenuItem>
        <MenuItem destructive={isActive} onClick={() => confirmRef.current?.open()}>
          {isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          {isActive ? "Deactivate" : "Reactivate"}
        </MenuItem>
      </Menu>
      {/*
        Rendered as a sibling of <Menu>, not nested inside it: Menu unmounts
        its children as soon as one is clicked, which would remove this
        dialog's native <dialog> element from the DOM before it ever shows.
      */}
      <ConfirmDialog
        ref={confirmRef}
        title={isActive ? "Deactivate trainer?" : "Reactivate trainer?"}
        description={
          isActive
            ? "The trainer is marked inactive. Existing assigned members and history are preserved."
            : "The trainer will be marked active again."
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        variant={isActive ? "destructive" : "primary"}
        onConfirm={handleToggle}
      />
    </>
  );
}
