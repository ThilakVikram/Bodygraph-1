"use client";

import { useActionState } from "react";
import { updateCurrencyAction } from "@/lib/actions/settings";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";

export function CurrencySettingsForm({ currency }: { currency: string }) {
  const [state, formAction, pending] = useActionState(updateCurrencyAction, initialActionState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <Field
        label="Currency"
        htmlFor="currency"
        hint="Used for all payment, membership, and revenue amounts."
        error={state.fieldErrors?.currency}
        className="mb-0 w-56"
      >
        <Select
          id="currency"
          name="currency"
          defaultValue={currency}
          invalid={!!state.fieldErrors?.currency}
        >
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={pending}>
        Save
      </Button>
    </form>
  );
}
