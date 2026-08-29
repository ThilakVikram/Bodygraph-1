"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type TrainerOption = { id: string; name: string };

export function AttendanceFilters({ trainers }: { trainers?: TrainerOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [trainerId, setTrainerId] = useState(searchParams.get("trainerId") ?? "");

  useEffect(() => {
    // Re-sync when the URL changes from elsewhere (back/forward, a "clear
    // filters" link) — these fields also hold in-progress edits, so they
    // can't just be derived from searchParams at render time.
    /* eslint-disable react-hooks/set-state-in-effect */
    setFrom(searchParams.get("from") ?? "");
    setTo(searchParams.get("to") ?? "");
    setTrainerId(searchParams.get("trainerId") ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  function pushParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = Boolean(from || to || trainerId || searchParams.get("search"));

  function handleClear() {
    setFrom("");
    setTo("");
    setTrainerId("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">From</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            pushParam("from", e.target.value);
          }}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">To</label>
        <Input
          type="date"
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            pushParam("to", e.target.value);
          }}
        />
      </div>
      {trainers && (
        <div className="w-48">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Trainer
          </label>
          <Select
            value={trainerId}
            onChange={(e) => {
              setTrainerId(e.target.value);
              pushParam("trainerId", e.target.value);
            }}
          >
            <option value="">All trainers</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}
