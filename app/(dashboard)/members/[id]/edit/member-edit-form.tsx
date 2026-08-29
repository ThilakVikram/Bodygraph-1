"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateMemberAction } from "@/lib/actions/members";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { MemberFormFields, type MemberFormDefaults, type Option } from "../../member-form-fields";

export function MemberEditForm({
  memberId,
  defaultValues,
  branches,
  trainers,
}: {
  memberId: string;
  defaultValues: MemberFormDefaults;
  branches: Option[];
  trainers: Option[];
}) {
  const [state, formAction, pending] = useActionState(updateMemberAction, initialActionState);
  useActionToast(state);

  return (
    <Card>
      <form action={formAction}>
        <input type="hidden" name="memberId" value={memberId} />
        <CardHeader>
          <CardTitle>Edit member</CardTitle>
          <CardDescription>Update this member&apos;s profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <MemberFormFields
            defaultValues={defaultValues}
            fieldErrors={state.fieldErrors}
            branches={branches}
            trainers={trainers}
          />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Link href={`/members/${memberId}`} className={buttonVariants("outline")}>
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
