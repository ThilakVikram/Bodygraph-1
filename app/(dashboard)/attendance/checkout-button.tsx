"use client";

import { useActionState } from "react";
import { checkOutAction } from "@/lib/actions/attendance";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";

export function CheckOutButton({ attendanceId }: { attendanceId: string }) {
  const [state, formAction, pending] = useActionState(checkOutAction, initialActionState);
  useActionToast(state);

  return (
    <form action={formAction}>
      <input type="hidden" name="attendanceId" value={attendanceId} />
      <Button type="submit" variant="outline" size="sm" loading={pending}>
        Check out
      </Button>
    </form>
  );
}
