"use client";

import { forwardRef, useImperativeHandle, useRef, useTransition } from "react";
import { Dialog, type DialogHandle } from "./dialog";
import { Button, type ButtonVariant } from "./button";

export type ConfirmDialogHandle = {
  open: () => void;
  close: () => void;
};

export type ConfirmDialogProps = {
  /**
   * Renders the trigger element inline with the dialog. Omit this (and control
   * the dialog via `ref` instead) when the trigger must live somewhere else in
   * the tree — e.g. as a <MenuItem> inside a <Menu>, which unmounts its
   * children as soon as one is clicked. A ConfirmDialog rendered *inside*
   * Menu's children would be unmounted (and its native <dialog> removed from
   * the DOM) before it ever shows. In that case, render this component as a
   * sibling of <Menu> instead, hold a ref to it, and have the <MenuItem>'s
   * onClick call `ref.current?.open()`.
   */
  trigger?: (open: () => void) => React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = forwardRef<ConfirmDialogHandle, ConfirmDialogProps>(
  function ConfirmDialog(
    { trigger, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", variant = "destructive", onConfirm },
    ref,
  ) {
    const dialogRef = useRef<DialogHandle>(null);
    const [pending, startTransition] = useTransition();

    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.open(),
      close: () => dialogRef.current?.close(),
    }));

    function handleConfirm() {
      startTransition(async () => {
        await onConfirm();
        dialogRef.current?.close();
      });
    }

    return (
      <>
        {trigger?.(() => dialogRef.current?.open())}
        <Dialog ref={dialogRef} title={title} description={description}>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button type="button" variant={variant} onClick={handleConfirm} loading={pending}>
              {confirmLabel}
            </Button>
          </div>
        </Dialog>
      </>
    );
  },
);
