"use client";

import { useActionState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { sendAnnouncementAction } from "@/lib/actions/notifications";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { ROLES, ROLE_LABELS } from "@/lib/auth/constants";

export function AnnouncementDialog() {
  const dialogRef = useRef<DialogHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    sendAnnouncementAction,
    initialActionState,
  );
  useActionToast(state);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      dialogRef.current?.close();
    }
  }, [state]);

  return (
    <>
      <Button type="button" size="sm" onClick={() => dialogRef.current?.open()}>
        <Megaphone className="h-4 w-4" />
        New Announcement
      </Button>
      <Dialog
        ref={dialogRef}
        title="New Announcement"
        description="Broadcast a notification to a chosen audience."
      >
        <form ref={formRef} action={formAction} className="space-y-4">
          <Field label="Title" htmlFor="title" required error={state.fieldErrors?.title}>
            <Input id="title" name="title" maxLength={150} invalid={!!state.fieldErrors?.title} />
          </Field>
          <Field label="Message" htmlFor="message" required error={state.fieldErrors?.message}>
            <Textarea
              id="message"
              name="message"
              rows={4}
              maxLength={2000}
              invalid={!!state.fieldErrors?.message}
            />
          </Field>
          <Field label="Audience" htmlFor="audience" required error={state.fieldErrors?.audience}>
            <Select id="audience" name="audience" defaultValue="ALL" invalid={!!state.fieldErrors?.audience}>
              <option value="ALL">Everyone</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Send announcement
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
