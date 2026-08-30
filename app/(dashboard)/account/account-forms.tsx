"use client";

import { useActionState } from "react";
import { updateProfileAction, changePasswordAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AccountForms({
  name,
  username,
  email,
  phone,
}: {
  name: string;
  username: string;
  email: string | null;
  phone: string;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initialActionState,
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    initialActionState,
  );
  useActionToast(profileState);
  useActionToast(passwordState);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <form action={profileAction}>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your basic account information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Username" htmlFor="username-display">
              <Input id="username-display" value={username} disabled />
            </Field>
            {email && (
              <Field label="Email" htmlFor="email-display">
                <Input id="email-display" value={email} disabled />
              </Field>
            )}
            <Field label="Full name" htmlFor="name" required error={profileState.fieldErrors?.name}>
              <Input id="name" name="name" defaultValue={name} invalid={!!profileState.fieldErrors?.name} />
            </Field>
            <Field label="Phone" htmlFor="phone" required error={profileState.fieldErrors?.phone}>
              <Input id="phone" name="phone" defaultValue={phone} invalid={!!profileState.fieldErrors?.phone} />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={profilePending}>
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <form action={passwordAction}>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>Choose a strong password you don&apos;t use elsewhere.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Current password"
              htmlFor="currentPassword"
              required
              error={passwordState.fieldErrors?.currentPassword}
            >
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                invalid={!!passwordState.fieldErrors?.currentPassword}
              />
            </Field>
            <Field
              label="New password"
              htmlFor="newPassword"
              required
              error={passwordState.fieldErrors?.newPassword}
              hint="At least 8 characters."
            >
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                invalid={!!passwordState.fieldErrors?.newPassword}
              />
            </Field>
            <Field
              label="Confirm new password"
              htmlFor="confirmPassword"
              required
              error={passwordState.fieldErrors?.confirmPassword}
            >
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                invalid={!!passwordState.fieldErrors?.confirmPassword}
              />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={passwordPending}>
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
