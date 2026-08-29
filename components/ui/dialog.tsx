"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DialogHandle = {
  open: () => void;
  close: () => void;
};

export const Dialog = forwardRef<
  DialogHandle,
  {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    onClose?: () => void;
  }
>(function Dialog({ title, description, children, className, onClose }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open: () => dialogRef.current?.showModal(),
    close: () => dialogRef.current?.close(),
  }));

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      className={cn(
        "m-auto w-full max-w-lg rounded-xl border border-border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex items-start justify-between border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close dialog"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
});
