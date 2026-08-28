"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createMemberAction } from "@/lib/actions/members";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MemberFormFields, type Option } from "./member-form-fields";

export function MemberFormDialog({
  branches,
  trainers,
}: {
  branches: Option[];
  trainers: Option[];
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(createMemberAction, initialActionState);
  useActionToast(state);

  const created = state.success && typeof state.data?.memberId === "string";

  function openDialog() {
    dialogRef.current?.open();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button onClick={openDialog}>
        <Plus className="h-4 w-4" />
        New Member
      </Button>
      <Dialog
        ref={dialogRef}
        title={created ? "Member created" : "New Member"}
        description={created ? undefined : "Create a member account and profile."}
        className="max-w-2xl"
      >
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share these temporary credentials with the member. The password is shown only
              once.
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Member code</span>
                <span className="font-mono font-medium text-foreground">
                  {String(state.data?.memberCode ?? "")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Temporary password</span>
                <span className="font-mono font-medium text-foreground">
                  {String(state.data?.tempPassword ?? "")}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Close
              </Button>
              <Link
                href={`/members/${String(state.data?.memberId ?? "")}`}
                className={buttonVariants("primary")}
              >
                View member
              </Link>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <MemberFormFields fieldErrors={state.fieldErrors} branches={branches} trainers={trainers} />
            <Field label="Photo" htmlFor="photo" hint="JPEG, PNG or WEBP, up to 5MB. Optional.">
              <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Create member
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
