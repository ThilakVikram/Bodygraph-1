"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  sublabel?: string;
};

type Position = { top?: number; bottom?: number; left: number; width: number };

/**
 * A searchable dropdown: type to filter a long option list, click to select.
 * Pass `name` to also submit the selected value via a plain <form action={...}>
 * (a hidden input carries it — the visible text input is search-only and
 * never submitted). Positions its list through a portal with `fixed`
 * coordinates, same reasoning as components/ui/menu.tsx: escapes any
 * ancestor's `overflow-x-auto` (e.g. the table wrapper) and flips above the
 * trigger instead of overflowing the viewport's bottom edge.
 */
export function Combobox({
  options,
  value,
  onChange,
  name,
  placeholder = "Search…",
  disabled,
  invalid,
}: {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // A `<dialog>` shown via showModal() renders in the browser's top layer —
    // a document.body portal would paint behind it, so when the combobox
    // lives inside one, portal into the dialog itself to stay in that layer.
    setPortalTarget(wrapRef.current?.closest("dialog") ?? document.body);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !position?.top) return;
    const contentRect = contentRef.current?.getBoundingClientRect();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!contentRect || !rect) return;
    if (contentRect.bottom > window.innerHeight) {
      setPosition((prev) =>
        prev ? { ...prev, top: undefined, bottom: window.innerHeight - rect.top + 4 } : prev,
      );
    }
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || contentRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onReposition() {
      updatePosition();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const filtered = query.trim()
    ? options.filter((o) =>
        `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : options;

  function select(option: ComboboxOption) {
    onChange(option.value);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="relative">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          value={open ? query : (selected?.label ?? "")}
          placeholder={placeholder}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 pr-9 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open &&
        position &&
        portalTarget &&
        createPortal(
          <div
            ref={contentRef}
            id={listId}
            role="listbox"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              width: position.width,
            }}
            className="fixed z-50 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {filtered.length === 0 ? (
              <p className="px-2.5 py-2 text-sm text-muted-foreground">No matches.</p>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => select(option)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                    {option.sublabel && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{option.sublabel}</span>
                    )}
                  </span>
                  {option.value === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>,
          portalTarget,
        )}
    </div>
  );
}
