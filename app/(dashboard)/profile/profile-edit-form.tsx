"use client";

import { useActionState } from "react";
import { updateOwnProfileAction } from "@/lib/actions/members";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function ProfileEditForm({
  address,
  emergencyContactName,
  emergencyContactPhone,
}: {
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateOwnProfileAction, initialActionState);
  useActionToast(state);

  return (
    <Card>
      <form action={formAction}>
        <CardHeader>
          <CardTitle>Address & emergency contact</CardTitle>
          <CardDescription>Keep this information current in case of an emergency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Address" htmlFor="address" error={state.fieldErrors?.address}>
            <Textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={address ?? ""}
              invalid={!!state.fieldErrors?.address}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Emergency contact name"
              htmlFor="emergencyContactName"
              error={state.fieldErrors?.emergencyContactName}
            >
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                defaultValue={emergencyContactName ?? ""}
                invalid={!!state.fieldErrors?.emergencyContactName}
              />
            </Field>
            <Field
              label="Emergency contact phone"
              htmlFor="emergencyContactPhone"
              error={state.fieldErrors?.emergencyContactPhone}
            >
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                defaultValue={emergencyContactPhone ?? ""}
                invalid={!!state.fieldErrors?.emergencyContactPhone}
              />
            </Field>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
