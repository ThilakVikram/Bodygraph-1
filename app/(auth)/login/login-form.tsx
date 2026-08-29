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

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Demo accounts (dev only)</p>
            <p>admin@bodygraph.dev / Admin@123</p>
            <p>reception@bodygraph.dev / Reception@123</p>
            <p>trainer@bodygraph.dev / Trainer@123</p>
            <p>member@bodygraph.dev / Member@123</p>
          </div>
        )}
      </div>
    </div>
  );
}
