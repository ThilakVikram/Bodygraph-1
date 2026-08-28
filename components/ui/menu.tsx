"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * A dropdown menu. Closes on click-outside, Escape, or a click anywhere in
 * its content (so a plain <MenuItem> action auto-closes the menu).
 *
 * IMPORTANT: because it closes (and unmounts its children) on click, never
 * nest a self-rendering dialog (Dialog/ConfirmDialog/any `trigger`-prop
 * dialog) directly inside Menu's children — the click that opens it would
 * also unmount it, removing its native <dialog> element before it shows.
 * Instead render the dialog as a *sibling* of <Menu>, hold a ref to it
 * (Dialog/ConfirmDialog and friends accept a `ref` as an alternative to
 * `trigger`), and have the <MenuItem>'s onClick call `ref.current?.open()`.
 * See member-row-actions.tsx / user-row-actions.tsx for worked examples.
 */
export function Menu({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  className,
  destructive,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground hover:bg-muted",
        destructive && "text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    />
  );
}
