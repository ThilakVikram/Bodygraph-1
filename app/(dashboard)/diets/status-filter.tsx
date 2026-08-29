"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@/components/ui/select";
import { WORKOUT_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function StatusFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get("status") ?? "";

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("status", next);
    else params.delete("status");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={value} onChange={(e) => handleChange(e.target.value)} className="w-40">
      <option value="">All statuses</option>
      {WORKOUT_STATUSES.map((status) => (
        <option key={status} value={status}>
          {titleCase(status)}
        </option>
      ))}
    </Select>
  );
}
