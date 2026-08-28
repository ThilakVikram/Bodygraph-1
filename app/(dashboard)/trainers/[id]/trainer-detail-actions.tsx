"use client";

import { useRouter } from "next/navigation";
import { Pencil, Ban, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { initialActionState } from "@/lib/actions/types";
import { deactivateTrainerAction, reactivateTrainerAction } from "@/lib/actions/trainers";

export function TrainerDetailActions({ trainerId, isActive }: { trainerId: string; isActive: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleToggle() {
    const formData = new FormData();
    formData.set("trainerId", trainerId);
    const action = isActive ? deactivateTrainerAction : reactivateTrainerAction;
    const result = await action(initialActionState, formData);
    if (result.error) {
      toast({ title: "Something went wrong", description: result.error, variant: "error" });
    } else if (result.message) {
      toast({ title: "Success", description: result.message, variant: "success" });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => router.push(`/trainers/${trainerId}/edit`)}>
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
        title={isActive ? "Deactivate trainer?" : "Reactivate trainer?"}
        description={
          isActive
            ? "The trainer is marked inactive. Existing assigned members and history are preserved."
            : "The trainer will be marked active again."
        }
        confirmLabel={isActive ? "Deactivate" : "Reactivate"}
        variant={isActive ? "destructive" : "primary"}
        onConfirm={handleToggle}
      />
    </div>
  );
}
