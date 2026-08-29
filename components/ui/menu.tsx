"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Position = { top?: number; bottom?: number; left?: number; right?: number };

/**
 * A dropdown menu. Closes on click-outside, Escape, or a click anywhere in
 * its content (so a plain <MenuItem> action auto-closes the menu).
 *
 * Renders its content through a portal into document.body, positioned with
 * `fixed` coordinates computed from the trigger — not absolutely inside the
 * trigger's own DOM position. Table wrappers (see components/ui/table.tsx)
 * use `overflow-x-auto`, which clips absolutely-positioned descendants; a
 * portal escapes that clipping so the menu always floats over the page
 * instead of getting cut off inside the table.
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
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(
      align === "end"
        ? { top: rect.bottom + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, left: rect.left },
    );
  }

  useLayoutEffect(() => {
    if (open) updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, align]);

  // Flip above the trigger if the menu would overflow the viewport's bottom
  // edge — a fixed-position element that extends past 100vh still expands
  // the page's scrollable area, which reads as "opening the menu adds a
  // scrollbar" even though the menu itself doesn't move on scroll.
  useLayoutEffect(() => {
    if (!open || !position?.top) return;
    const contentRect = contentRef.current?.getBoundingClientRect();
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    if (!contentRect || !triggerRect) return;
    if (contentRect.bottom > window.innerHeight) {
      setPosition((prev) =>
        prev ? { ...prev, top: undefined, bottom: window.innerHeight - triggerRect.top + 4 } : prev,
      );
    }
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || contentRef.current?.contains(target)) {
        return;
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="inline-block" ref={triggerRef}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open &&
        position &&
        createPortal(
          <div
            ref={contentRef}
            role="menu"
            style={{
              top: position.top,
              bottom: position.bottom,
              left: position.left,
              right: position.right,
            }}
            className={cn(
              "fixed z-50 min-w-[11rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg",
            )}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body,
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
