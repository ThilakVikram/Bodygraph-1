"use client";

import { useActionState } from "react";
import { Dumbbell } from "lucide-react";
import { loginAction } from "@/lib/actions/auth";
import { initialActionState } from "@/lib/actions/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { APP_NAME } from "@/lib/constants";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold text-foreground">{APP_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
          {state.error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <Field
            label="Username or Phone Number"
            htmlFor="identifier"
            required
            error={state.fieldErrors?.identifier}
          >
            <Input
              id="identifier"
              name="identifier"
              autoComplete="username"
              placeholder="Username or phone number"
              invalid={!!state.fieldErrors?.identifier}
            />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            required
            error={state.fieldErrors?.password}
          >
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              invalid={!!state.fieldErrors?.password}
            />
          </Field>
          <Button type="submit" className="w-full" loading={pending}>
            Sign in
          </Button>
        </form>

      </div>
    </div>
  );
}
