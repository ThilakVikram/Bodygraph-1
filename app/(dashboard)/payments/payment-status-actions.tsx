"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { updatePaymentStatusAction } from "@/lib/actions/payments";
import type { PaymentStatus } from "@/lib/validations/payment";

export function PaymentStatusActions({
  paymentId,
  status,
}: {
  paymentId: string;
  status: string;
}) {
  const { toast } = useToast();

  async function run(nextStatus: PaymentStatus) {
    const result = await updatePaymentStatusAction(paymentId, nextStatus);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
    }
  }

  if (status === "PENDING") {
    return (
      <div className="flex justify-end gap-2">
        <ConfirmDialog
          trigger={(open) => (
            <Button variant="outline" size="sm" onClick={open}>
              Mark Paid
            </Button>
          )}
          title="Mark payment as paid"
          description="This confirms the payment and notifies the member."
          confirmLabel="Mark Paid"
          variant="primary"
          onConfirm={() => run("PAID")}
        />
        <ConfirmDialog
          trigger={(open) => (
            <Button variant="outline" size="sm" onClick={open}>
              Mark Failed
            </Button>
          )}
          title="Mark payment as failed"
          description="This marks the payment attempt as failed."
          confirmLabel="Mark Failed"
          variant="destructive"
          onConfirm={() => run("FAILED")}
        />
      </div>
    );
  }

  if (status === "PAID") {
    return (
      <div className="flex justify-end">
        <ConfirmDialog
          trigger={(open) => (
            <Button variant="outline" size="sm" onClick={open}>
              Refund
            </Button>
          )}
          title="Refund this payment"
          description="This marks the payment as refunded. This cannot be undone."
          confirmLabel="Refund"
          variant="destructive"
          onConfirm={() => run("REFUNDED")}
        />
      </div>
    );
  }

  return null;
}
