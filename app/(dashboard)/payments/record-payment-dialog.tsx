"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionToast } from "@/hooks/use-action-toast";
import { recordPaymentAction } from "@/lib/actions/payments";
import { initialActionState } from "@/lib/actions/types";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/constants";
import { formatDate, titleCase } from "@/lib/utils";

export type MemberOption = {
  id: string;
  name: string;
  email: string;
  memberCode: string;
};

export type MembershipOption = {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
};

export function RecordPaymentDialog({
  members,
  defaultMemberId,
  defaultMembershipId,
  initialMemberships,
  autoOpen,
}: {
  members: MemberOption[];
  defaultMemberId?: string;
  defaultMembershipId?: string;
  initialMemberships: MembershipOption[];
  autoOpen: boolean;
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(recordPaymentAction, initialActionState);
  const [memberId, setMemberId] = useState(defaultMemberId ?? "");
  const [memberships, setMemberships] = useState<MembershipOption[]>(initialMemberships);
  const [loadingMemberships, startMembershipFetch] = useTransition();
  const openedForDeepLink = useRef(false);
  const handledState = useRef(state);
  const today = new Date().toISOString().slice(0, 10);

  useActionToast(state);

  useEffect(() => {
    if (autoOpen && !openedForDeepLink.current) {
      openedForDeepLink.current = true;
      dialogRef.current?.open();
    }
  }, [autoOpen]);

  useEffect(() => {
    if (handledState.current === state) return;
    handledState.current = state;
    if (state.success) {
      dialogRef.current?.close();
    }
  }, [state]);

  function handleMemberChange(nextId: string) {
    setMemberId(nextId);
    if (!nextId) {
      setMemberships([]);
      return;
    }
    startMembershipFetch(async () => {
      try {
        const res = await fetch(`/api/members/${nextId}/memberships`);
        if (!res.ok) throw new Error("Failed to load memberships");
        const data = (await res.json()) as MembershipOption[];
        setMemberships(data);
      } catch {
        setMemberships([]);
      }
    });
  }

  return (
    <>
      <Button onClick={() => dialogRef.current?.open()}>Record Payment</Button>
      <Dialog
        ref={dialogRef}
        title="Record Payment"
        description="Log a payment made by a member."
      >
        <form action={formAction} className="space-y-4">
          <Field label="Member" htmlFor="memberId" required error={state.fieldErrors?.memberId}>
            <Select
              id="memberId"
              name="memberId"
              value={memberId}
              onChange={(e) => handleMemberChange(e.target.value)}
              invalid={!!state.fieldErrors?.memberId}
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.memberCode})
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Membership"
            htmlFor="membershipId"
            hint="Optional — link to a specific membership, or leave blank for a one-off charge."
            error={state.fieldErrors?.membershipId}
          >
            <Select
              id="membershipId"
              name="membershipId"
              disabled={!memberId || loadingMemberships}
              defaultValue={defaultMembershipId ?? ""}
              key={memberId}
            >
              <option value="">No specific membership</option>
              {memberships.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.planName} ({formatDate(m.startDate)} – {formatDate(m.endDate)})
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount" htmlFor="amount" required error={state.fieldErrors?.amount}>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                invalid={!!state.fieldErrors?.amount}
              />
            </Field>
            <Field
              label="Payment date"
              htmlFor="paymentDate"
              required
              error={state.fieldErrors?.paymentDate}
            >
              <Input
                id="paymentDate"
                name="paymentDate"
                type="date"
                defaultValue={today}
                invalid={!!state.fieldErrors?.paymentDate}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Method" htmlFor="method" required error={state.fieldErrors?.method}>
              <Select id="method" name="method" invalid={!!state.fieldErrors?.method}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {titleCase(m)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="status" required error={state.fieldErrors?.status}>
              <Select
                id="status"
                name="status"
                defaultValue="PAID"
                invalid={!!state.fieldErrors?.status}
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {titleCase(s)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes" hint="Optional" error={state.fieldErrors?.notes}>
            <Textarea id="notes" name="notes" rows={2} />
          </Field>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Record Payment
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
