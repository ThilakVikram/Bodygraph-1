"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createTrainerAction } from "@/lib/actions/trainers";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Dialog, type DialogHandle } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { TrainerFormFields, type Option } from "./trainer-form-fields";

export function TrainerFormDialog({ branches }: { branches: Option[] }) {
  const dialogRef = useRef<DialogHandle>(null);
  const [state, formAction, pending] = useActionState(createTrainerAction, initialActionState);
  useActionToast(state);

  const created = state.success && typeof state.data?.trainerId === "string";

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
        New Trainer
      </Button>
      <Dialog
        ref={dialogRef}
        title={created ? "Trainer created" : "New Trainer"}
        description={created ? undefined : "Create a trainer account and profile."}
        className="max-w-2xl"
      >
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share these temporary credentials with the trainer. The password is shown only
              once.
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
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
                href={`/trainers/${String(state.data?.trainerId ?? "")}`}
                className={buttonVariants("primary")}
              >
                View trainer
              </Link>
            </div>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <TrainerFormFields fieldErrors={state.fieldErrors} branches={branches} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                Create trainer
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
