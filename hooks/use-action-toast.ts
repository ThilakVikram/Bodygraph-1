"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast-provider";
import type { ActionState } from "@/lib/actions/types";

/** Fires a toast whenever a useActionState result changes with an error or message. */
export function useActionToast(state: ActionState) {
  const { toast } = useToast();
  const lastHandled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state === lastHandled.current) return;
    lastHandled.current = state;

    if (state.error) {
      toast({ title: "Something went wrong", description: state.error, variant: "error" });
    } else if (state.message) {
      toast({
        title: state.success ? "Success" : "Notice",
        description: state.message,
        variant: state.success ? "success" : "info",
      });
    }
  }, [state, toast]);
}
