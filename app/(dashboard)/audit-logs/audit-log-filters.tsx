"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { titleCase } from "@/lib/utils";

export function AuditLogFilters({ entities }: { entities: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");

  useEffect(() => {
    // Re-sync when the URL changes from elsewhere (back/forward, a "clear
    // filters" link) — these fields also hold in-progress edits, so they
    // can't just be derived from searchParams at render time.
    /* eslint-disable react-hooks/set-state-in-effect */
    setFrom(searchParams.get("from") ?? "");
    setTo(searchParams.get("to") ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  const hasFilters = Boolean(
    from || to || searchParams.get("entity") || searchParams.get("action") || searchParams.get("search"),
  );

  function handleClear() {
    setFrom("");
    setTo("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-44">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Entity</label>
        <Select
          value={searchParams.get("entity") ?? ""}
          onChange={(e) => setParam("entity", e.target.value)}
        >
          <option value="">All entities</option>
          {entities.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Action</label>
        <Select
          value={searchParams.get("action") ?? ""}
          onChange={(e) => setParam("action", e.target.value)}
        >
          <option value="">All actions</option>
          {AUDIT_ACTIONS.map((action) => (
            <option key={action} value={action}>
              {titleCase(action)}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">From</label>
        <Input
          type="date"
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setParam("from", e.target.value);
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
            setParam("to", e.target.value);
          }}
        />
      </div>
      {hasFilters && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}
