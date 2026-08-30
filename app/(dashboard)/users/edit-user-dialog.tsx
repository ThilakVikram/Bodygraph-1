"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useActionState } from "react";
import { updateUserAction } from "@/lib/actions/users";
import { initialActionState } from "@/lib/actions/types";
import { STAFF_ROLES } from "@/lib/validations/user";
import { ROLE_LABELS, type Role } from "@/lib/auth/constants";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type EditableUser = {
  id: string;
  name: string;
  username: string;
  phone: string;
  role: string;
  isActive: boolean;
};

export type EditUserDialogHandle = { open: () => void };

const STAFF_ROLE_SET: readonly string[] = STAFF_ROLES;

/**
 * Ref-controlled: rendered as a sibling of the row's <Menu>, not nested inside it.
 * Menu unmounts its children as soon as it closes (which happens on the same click
 * that opens this dialog via bubbling), so a Dialog nested inside Menu's children
 * would be removed from the DOM before it ever paints.
 */
export const EditUserDialog = forwardRef<EditUserDialogHandle, { user: EditableUser; isSelf: boolean }>(
  function EditUserDialog({ user, isSelf }, ref) {
    const dialogRef = useRef<DialogHandle>(null);
    const [state, formAction, pending] = useActionState(updateUserAction, initialActionState);
    useActionToast(state);

    useImperativeHandle(ref, () => ({ open: () => dialogRef.current?.open() }));

    useEffect(() => {
      if (state.success) dialogRef.current?.close();
    }, [state]);

    const canEditRole = STAFF_ROLE_SET.includes(user.role);

    return (
      <Dialog ref={dialogRef} title="Edit user" description={`Update account details for ${user.name}.`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />

          <Field label="Full name" htmlFor="edit-name" required error={state.fieldErrors?.name}>
            <Input id="edit-name" name="name" defaultValue={user.name} invalid={!!state.fieldErrors?.name} />
          </Field>

          <Field label="Username" htmlFor="edit-username" required error={state.fieldErrors?.username}>
            <Input
              id="edit-username"
              name="username"
              defaultValue={user.username}
              invalid={!!state.fieldErrors?.username}
            />
          </Field>

          <Field label="Phone" htmlFor="edit-phone" required error={state.fieldErrors?.phone}>
            <Input id="edit-phone" name="phone" defaultValue={user.phone} invalid={!!state.fieldErrors?.phone} />
          </Field>

          {canEditRole ? (
            <Field label="Role" htmlFor="edit-role" error={state.fieldErrors?.role}>
              <Select
                id="edit-role"
                name="role"
                defaultValue={user.role}
                disabled={isSelf && user.role === "ADMIN"}
                invalid={!!state.fieldErrors?.role}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r as Role]}
                  </option>
                ))}
              </Select>
              {isSelf && user.role === "ADMIN" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You can&apos;t change your own role away from Admin.
                </p>
              )}
            </Field>
          ) : (
            <Field label="Role">
              <p className="text-sm text-muted-foreground">
                {ROLE_LABELS[user.role as Role] ?? user.role} — managed from the{" "}
                {user.role === "TRAINER" ? "Trainers" : "Members"} module.
              </p>
            </Field>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-isActive"
              name={isSelf ? undefined : "isActive"}
              defaultChecked={user.isActive}
              disabled={isSelf}
            />
            <Label htmlFor="edit-isActive" className="mb-0">
              Active
            </Label>
          </div>
          {/* Disabled checkboxes are excluded from FormData entirely, so carry the
              current value through a hidden field when editing your own account. */}
          {isSelf && <input type="hidden" name="isActive" value="true" />}
          {isSelf && (
            <p className="-mt-2 text-xs text-muted-foreground">
              You can&apos;t deactivate your own account.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </div>
        </form>
      </Dialog>
    );
  },
);
