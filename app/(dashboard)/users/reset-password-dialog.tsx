"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from "react";
import { resetUserPasswordAction } from "@/lib/actions/users";
import { initialActionState } from "@/lib/actions/types";
import { useToast } from "@/components/ui/toast-provider";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ResetPasswordDialogHandle = { open: () => void; close: () => void };

/**
 * `trigger` renders a visible trigger inline. Pass `ref` instead (and omit
 * `trigger`) when this must be controlled from a <MenuItem> living inside a
 * <Menu> — render this component as a sibling of <Menu>, not a child of it.
 */
export const ResetPasswordDialog = forwardRef<
  ResetPasswordDialogHandle,
  {
    userId: string;
    userName: string;
    trigger?: (open: () => void) => React.ReactNode;
  }
>(function ResetPasswordDialog({ userId, userName, trigger }, ref) {
  const dialogRef = useRef<DialogHandle>(null);
  const [pending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const { toast } = useToast();

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.open(),
    close: () => dialogRef.current?.close(),
  }));

  function reset() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", userId);
      const result = await resetUserPasswordAction(initialActionState, formData);
      if (result.error) {
        toast({ title: "Something went wrong", description: result.error, variant: "error" });
      } else {
        setTempPassword(String(result.data?.tempPassword ?? ""));
      }
    });
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      {trigger?.(() => dialogRef.current?.open())}
      <Dialog
        ref={dialogRef}
        title={tempPassword ? "Password reset" : "Reset password"}
        description={
          tempPassword
            ? undefined
            : `Generate a new temporary password for ${userName}. They'll be signed out everywhere and must change it on next login.`
        }
        onClose={() => setTempPassword(null)}
      >
        {tempPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this temporary password with {userName}. It won&apos;t be shown again.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-center font-mono text-lg font-medium text-foreground">
              {tempPassword}
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={reset} loading={pending}>
              Reset password
            </Button>
          </div>
        )}
      </Dialog>
    </>
  );
});
