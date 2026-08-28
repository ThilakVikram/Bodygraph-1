"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Global date-range filter for the Reports page — applies to every tab's detail table and export. */
export function DateRangeFilter() {
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

  function apply(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");
    if (nextTo) params.set("to", nextTo);
    else params.delete("to");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleClear() {
    setFrom("");
    setTo("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  return (
    <Card className="mb-6 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Date range
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="button" size="sm" onClick={() => apply(from, to)}>
          Apply
        </Button>
        {(searchParams.get("from") || searchParams.get("to")) && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Applies to the detail tables and CSV exports below. Charts always show their own fixed
        window regardless of this filter.
      </p>
    </Card>
  );
}
