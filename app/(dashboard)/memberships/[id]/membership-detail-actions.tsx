"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RefreshCcw, XCircle, Trash2, CreditCard } from "lucide-react";
import {
  renewMembershipAction,
  cancelMembershipAction,
  deleteMembershipAction,
} from "@/lib/actions/memberships";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { useToast } from "@/components/ui/toast-provider";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type PlanOption = { id: string; name: string; price: number; durationDays: number };

export function MembershipDetailActions({
  membershipId,
  memberId,
  memberName,
  status,
  currentPlanId,
  plans,
  currency,
  isAdmin,
}: {
  membershipId: string;
  memberId: string;
  memberName: string;
  status: string;
  currentPlanId: string;
  plans: PlanOption[];
  currency: string;
  isAdmin: boolean;
}) {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(renewMembershipAction, initialActionState);
  useActionToast(state);
  const { toast } = useToast();
  const router = useRouter();

  const [planId, setPlanId] = useState(currentPlanId);
  const selectedPlan = plans.find((p) => p.id === planId);

  useEffect(() => {
    if (state.success) dialogRef.current?.close();
  }, [state]);

  const canCancel = status === "ACTIVE" || status === "PENDING";

  async function handleCancel() {
    const fd = new FormData();
    fd.set("membershipId", membershipId);
    const result = await cancelMembershipAction(initialActionState, fd);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
    }
  }

  async function handleDelete() {
    const fd = new FormData();
    fd.set("membershipId", membershipId);
    const result = await deleteMembershipAction(initialActionState, fd);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
      router.push("/memberships");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/payments?memberId=${memberId}&membershipId=${membershipId}`}
        className={buttonVariants("outline", "md")}
      >
        <CreditCard className="h-4 w-4" /> Record Payment
      </Link>
      <Button onClick={() => dialogRef.current?.open()}>
        <RefreshCcw className="h-4 w-4" /> Renew
      </Button>
      {canCancel && (
        <ConfirmDialog
          trigger={(open) => (
            <Button variant="destructive" onClick={open}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
          title="Cancel this membership?"
          description={`This marks ${memberName}'s membership as cancelled. It stays in their history and can't be undone.`}
          confirmLabel="Cancel membership"
          onConfirm={handleCancel}
        />
      )}
      {isAdmin && (
        <ConfirmDialog
          trigger={(open) => (
            <Button variant="destructive" onClick={open}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          title="Delete this membership?"
          description={`This permanently deletes ${memberName}'s membership record. This can't be undone. Memberships with linked payments can't be deleted — cancel them instead.`}
          confirmLabel="Delete membership"
          onConfirm={handleDelete}
        />
      )}

      <Dialog
        ref={dialogRef}
        title="Renew membership"
        description={`Starts the day after ${memberName}'s current membership ends (or today, if it already lapsed).`}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="memberId" value={memberId} />

          <Field label="Plan" htmlFor="renew-planId" required error={state.fieldErrors?.planId}>
            <Select
              id="renew-planId"
              name="planId"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              invalid={!!state.fieldErrors?.planId}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price, currency)} / {p.durationDays}d
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Amount"
            htmlFor="renew-amount"
            hint="Defaults to plan price."
            error={state.fieldErrors?.amount}
          >
            <Input
              id="renew-amount"
              name="amount"
              type="number"
              min={0}
              step="0.01"
              placeholder={selectedPlan ? selectedPlan.price.toFixed(2) : "0.00"}
              invalid={!!state.fieldErrors?.amount}
            />
          </Field>

          <Field label="Notes" htmlFor="renew-notes" error={state.fieldErrors?.notes}>
            <Textarea id="renew-notes" name="notes" rows={3} invalid={!!state.fieldErrors?.notes} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Renew membership
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
