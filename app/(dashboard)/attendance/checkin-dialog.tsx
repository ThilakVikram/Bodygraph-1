"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { manualCheckInAction } from "@/lib/actions/attendance";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

type MemberOption = {
  id: string;
  memberCode: string;
  name: string;
  status: string;
};

export function CheckInDialog({ members }: { members: MemberOption[] }) {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(manualCheckInAction, initialActionState);
  useActionToast(state);

  useEffect(() => {
    if (state.success) {
      dialogRef.current?.close();
    }
  }, [state]);

  return (
    <>
      <Button type="button" onClick={() => dialogRef.current?.open()}>
        <UserPlus className="h-4 w-4" /> Manual check-in
      </Button>
      <Dialog
        ref={dialogRef}
        title="Manual check-in"
        description="Check a member in without scanning a QR code."
      >
        <form action={formAction} className="space-y-4">
          <Field label="Member" htmlFor="memberId" required error={state.fieldErrors?.memberId}>
            <Select
              id="memberId"
              name="memberId"
              defaultValue=""
              required
              invalid={!!state.fieldErrors?.memberId}
            >
              <option value="" disabled>
                Select a member
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberCode} — {m.name}
                  {m.status === "INACTIVE" ? " (Inactive)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Check in
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
