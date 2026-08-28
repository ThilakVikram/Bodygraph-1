"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";
import type { Option } from "./member-form-fields";

export function MemberFilters({
  trainerOptions,
  showTrainerFilter,
}: {
  trainerOptions: Option[];
  showTrainerFilter: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-40">
        <Select
          aria-label="Filter by status"
          value={searchParams.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>
      {showTrainerFilter && (
        <div className="w-48">
          <Select
            aria-label="Filter by trainer"
            value={searchParams.get("trainerId") ?? ""}
            onChange={(e) => setParam("trainerId", e.target.value)}
          >
            <option value="">All trainers</option>
            {trainerOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="w-44">
        <Select
          aria-label="Sort members"
          value={searchParams.get("sort") ?? "newest"}
          onChange={(e) => setParam("sort", e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name (A–Z)</option>
          <option value="name_desc">Name (Z–A)</option>
        </Select>
      </div>
    </div>
  );
}
