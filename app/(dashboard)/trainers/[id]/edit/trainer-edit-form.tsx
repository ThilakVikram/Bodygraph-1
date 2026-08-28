"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateTrainerAction } from "@/lib/actions/trainers";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { TrainerFormFields, type TrainerFormDefaults, type Option } from "../../trainer-form-fields";

export function TrainerEditForm({
  trainerId,
  defaultValues,
  branches,
}: {
  trainerId: string;
  defaultValues: TrainerFormDefaults;
  branches: Option[];
}) {
  const [state, formAction, pending] = useActionState(updateTrainerAction, initialActionState);
  useActionToast(state);

  return (
    <Card>
      <form action={formAction}>
        <input type="hidden" name="trainerId" value={trainerId} />
        <CardHeader>
          <CardTitle>Edit trainer</CardTitle>
          <CardDescription>Update this trainer&apos;s profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <TrainerFormFields defaultValues={defaultValues} fieldErrors={state.fieldErrors} branches={branches} />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link href={`/trainers/${trainerId}`} className={buttonVariants("outline")}>
            Cancel
          </Link>
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
