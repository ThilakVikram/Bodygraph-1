"use client";

import { useActionState } from "react";
import { Camera } from "lucide-react";
import { updateMemberPhotoAction } from "@/lib/actions/members";
import { initialActionState } from "@/lib/actions/types";
import { useActionToast } from "@/hooks/use-action-toast";
import { Avatar } from "@/components/ui/avatar";

export function MemberPhotoForm({
  memberId,
  name,
  photoUrl,
}: {
  memberId: string;
  name: string;
  photoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateMemberPhotoAction, initialActionState);
  useActionToast(state);

  return (
    <form action={formAction} className="flex flex-col items-center gap-3 text-center">
      <input type="hidden" name="memberId" value={memberId} />
      <Avatar name={name} src={photoUrl} size={96} />
      <label
        className="cursor-pointer text-sm font-medium text-primary hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={pending}
      >
        <Camera className="mr-1 inline h-4 w-4" />
        {pending ? "Uploading…" : "Change photo"}
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={pending}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
      </label>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </form>
  );
}
