"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Pencil, Ban, RotateCcw } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { initialActionState } from "@/lib/actions/types";
import { deactivateMemberAction, reactivateMemberAction } from "@/lib/actions/members";

export function MemberRowActions({ memberId, status }: { memberId: string; status: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const isActive = status === "ACTIVE";
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function handleToggle() {
    const formData = new FormData();
    formData.set("memberId", memberId);
    const action = isActive ? deactivateMemberAction : reactivateMemberAction;
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
        <MenuItem onClick={() => router.push(`/members/${memberId}`)}>
          <Eye className="h-4 w-4" /> View
        </MenuItem>
        <MenuItem onClick={() => router.push(`/members/${memberId}/edit`)}>
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
        title={isActive ? "Deactivate member?" : "Reactivate member?"}
        description={
          isActive
            ? "The member is marked inactive but their history is preserved, and they can be reactivated later."
            : "The member will be marked active again."
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        variant={isActive ? "destructive" : "primary"}
        onConfirm={handleToggle}
      />
    </>
  );
}
