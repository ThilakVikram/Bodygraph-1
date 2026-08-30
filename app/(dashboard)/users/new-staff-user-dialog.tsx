"use client";

import { useRef } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createStaffUserAction } from "@/lib/actions/users";
import { initialActionState } from "@/lib/actions/types";
import { STAFF_ROLES } from "@/lib/validations/user";
import { ROLE_LABELS, type Role } from "@/lib/auth/constants";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function NewStaffUserDialog() {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(createStaffUserAction, initialActionState);
  useActionToast(state);

  const created = state.success && typeof state.data?.tempPassword === "string";

  function open() {
    dialogRef.current?.open();
  }

  function close() {
    dialogRef.current?.close();
  }

  return (
    <>
      <Button onClick={open}>
        <Plus className="h-4 w-4" /> New Staff User
      </Button>
      <Dialog
        ref={dialogRef}
        title={created ? "Staff user created" : "New Staff User"}
        description={created ? undefined : "Create an Admin or Receptionist account."}
      >
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share these temporary credentials with {String(state.data?.name ?? "the user")}.
              The password is shown only once.
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono font-medium text-foreground">
                  {String(state.data?.username ?? "")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Temporary password</span>
                <span className="font-mono font-medium text-foreground">
                  {String(state.data?.tempPassword ?? "")}
                </span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <Field label="Full name" htmlFor="name" required error={state.fieldErrors?.name}>
              <Input id="name" name="name" invalid={!!state.fieldErrors?.name} />
            </Field>
            <Field
              label="Username"
              htmlFor="username"
              required
              hint="Lowercase letters, numbers, dots, underscores and hyphens."
              error={state.fieldErrors?.username}
            >
              <Input id="username" name="username" invalid={!!state.fieldErrors?.username} />
            </Field>
            <Field label="Phone number" htmlFor="phone" required error={state.fieldErrors?.phone}>
              <Input id="phone" name="phone" invalid={!!state.fieldErrors?.phone} />
            </Field>
            <Field label="Email" htmlFor="email" hint="Optional" error={state.fieldErrors?.email}>
              <Input id="email" name="email" type="email" invalid={!!state.fieldErrors?.email} />
            </Field>
            <Field label="Role" htmlFor="role" required error={state.fieldErrors?.role}>
              <Select id="role" name="role" defaultValue="RECEPTIONIST" invalid={!!state.fieldErrors?.role}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r as Role]}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Create user
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
