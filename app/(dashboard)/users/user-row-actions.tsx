"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, KeyRound, Ban, RotateCcw } from "lucide-react";
import { Menu, MenuItem } from "@/components/ui/menu";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { initialActionState } from "@/lib/actions/types";
import { toggleUserActiveAction } from "@/lib/actions/users";
import { EditUserDialog, type EditUserDialogHandle, type EditableUser } from "./edit-user-dialog";
import { ResetPasswordDialog, type ResetPasswordDialogHandle } from "./reset-password-dialog";

export function UserRowActions({
  user,
  currentUserId,
}: {
  user: EditableUser;
  currentUserId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const isSelf = user.id === currentUserId;
  const editRef = useRef<EditUserDialogHandle>(null);
  const resetRef = useRef<ResetPasswordDialogHandle>(null);
  const confirmRef = useRef<ConfirmDialogHandle>(null);

  async function handleToggleActive() {
    const formData = new FormData();
    formData.set("id", user.id);
    const result = await toggleUserActiveAction(initialActionState, formData);
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
        <MenuItem onClick={() => resetRef.current?.open()}>
          <KeyRound className="h-4 w-4" /> Reset password
        </MenuItem>
        {!isSelf && (
          <MenuItem destructive={user.isActive} onClick={() => confirmRef.current?.open()}>
            {user.isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            {user.isActive ? "Deactivate" : "Reactivate"}
          </MenuItem>
        )}
      </Menu>
      {/*
        All rendered as siblings of <Menu>, not nested inside it: Menu
        unmounts its children as soon as one is clicked, which would remove
        these dialogs' native <dialog> elements from the DOM before they ever show.
      */}
      <EditUserDialog ref={editRef} user={user} isSelf={isSelf} />
      <ResetPasswordDialog ref={resetRef} userId={user.id} userName={user.name} />
      {!isSelf && (
        <ConfirmDialog
          ref={confirmRef}
          title={user.isActive ? "Deactivate user?" : "Reactivate user?"}
          description={
            user.isActive
              ? `${user.name} will be signed out immediately and won't be able to log in until reactivated.`
              : `${user.name} will be able to log in again.`
          }
          confirmLabel={user.isActive ? "Deactivate" : "Reactivate"}
          variant={user.isActive ? "destructive" : "primary"}
          onConfirm={handleToggleActive}
        />
      )}
    </>
  );
}
