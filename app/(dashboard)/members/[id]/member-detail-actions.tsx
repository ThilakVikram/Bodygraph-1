"use client";

import { useRouter } from "next/navigation";
import { Pencil, Ban, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { initialActionState } from "@/lib/actions/types";
import { deactivateMemberAction, reactivateMemberAction } from "@/lib/actions/members";

export function MemberDetailActions({ memberId, status }: { memberId: string; status: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const isActive = status === "ACTIVE";

  async function handleToggle() {
    const formData = new FormData();
    formData.set("memberId", memberId);
    const action = isActive ? deactivateMemberAction : reactivateMemberAction;
    const result = await action(initialActionState, formData);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => router.push(`/members/${memberId}/edit`)}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <ConfirmDialog
        trigger={(open) => (
          <Button variant={isActive ? "destructive" : "primary"} onClick={open}>
            {isActive ? <Ban className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            {isActive ? "Deactivate" : "Reactivate"}
          </Button>
        )}
        title={isActive ? "Deactivate member?" : "Reactivate member?"}
        description={
          isActive
            ? "The member is marked inactive but their history is preserved, and they can be reactivated later."
            : "The member will be marked active again."
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        variant={isActive ? "destructive" : "primary"}
        onConfirm={handleToggle}
      />
    </div>
  );
}
