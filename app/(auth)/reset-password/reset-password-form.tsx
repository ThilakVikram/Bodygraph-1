"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPasswordAction,
    initialActionState,
  );

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12 text-center">
        <div>
          <p className="text-sm text-destructive">Missing or invalid reset link.</p>
          <Link
            href="/forgot-password"
            className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
          >
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-foreground">Reset password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>
        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <input type="hidden" name="token" value={token} />
          {state.error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.success ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
                {state.message}
              </p>
              <Link
                href="/login"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              <Field
                label="New password"
                htmlFor="newPassword"
                required
                error={state.fieldErrors?.newPassword}
              >
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  invalid={!!state.fieldErrors?.newPassword}
                />
              </Field>
              <Field
                label="Confirm password"
                htmlFor="confirmPassword"
                required
                error={state.fieldErrors?.confirmPassword}
              >
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  invalid={!!state.fieldErrors?.confirmPassword}
                />
              </Field>
              <Button type="submit" className="w-full" loading={pending}>
                Reset password
              </Button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
