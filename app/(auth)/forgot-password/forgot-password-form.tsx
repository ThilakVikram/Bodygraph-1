"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    forgotPasswordAction,
    initialActionState,
  );
  const devResetUrl = state.data?.devResetUrl as string | undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-foreground">Forgot password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          {state.success ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-success/30 bg-success-bg px-3 py-2 text-sm text-success">
                {state.message}
              </p>
              {devResetUrl && (
                <p className="break-all rounded-lg border border-border bg-muted p-2 text-xs text-muted-foreground">
                  Dev only — reset link:{" "}
                  <Link href={devResetUrl} className="text-primary underline">
                    {devResetUrl}
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <>
              <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email}>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  invalid={!!state.fieldErrors?.email}
                />
              </Field>
              <Button type="submit" className="w-full" loading={pending}>
                Send reset link
              </Button>
            </>
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
