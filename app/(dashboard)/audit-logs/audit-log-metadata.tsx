"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function parseMetadata(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AuditLogMetadata({ raw }: { raw: string | null }) {
  const [open, setOpen] = useState(false);
  const metadata = parseMetadata(raw);

  if (!metadata || Object.keys(metadata).length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {open ? "Hide details" : "View details"}
      </button>
      <div
        className={cn(
          "mt-2 space-y-1 rounded-lg border border-border bg-muted/40 p-3 text-xs",
          !open && "hidden",
        )}
      >
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <span className="font-medium text-muted-foreground">{key}</span>
            <span className="break-all text-right text-foreground">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
