"use client";
import type { ComponentProps } from "react";
import { useContext, useEffect, useLayoutEffect, useRef } from "react";
import type * as Dialog from "@radix-ui/react-dialog";
import { SheetStackContext, useSheetInstance } from "./context.js";

export function useSheetFocus({
  onOpenAutoFocus,
  onCloseAutoFocus,
}: Pick<ComponentProps<typeof Dialog.Content>, "onOpenAutoFocus" | "onCloseAutoFocus">) {
  const stack = useContext(SheetStackContext)!;
  const instance = useSheetInstance();
  const layout = instance.layout;
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (instance.open)
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [instance.open]);
  useEffect(() => {
    if (
      layout?.top &&
      !layout.covered &&
      instance.contentRef.current?.contains(document.activeElement) === false &&
      (layout.modal || document.activeElement?.closest("[data-mendy-sheet-content][inert]"))
    ) {
      instance.contentRef.current.focus({ preventScroll: true });
    }
  }, [layout?.top, layout?.modal, layout?.covered, instance.contentRef]);
  return {
    onOpen(event: Event) {
      onOpenAutoFocus?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      instance.contentRef.current?.focus({ preventScroll: true });
    },
    onClose(event: Event) {
      queueMicrotask(() => stack.store.removeManaged(instance.id));
      onCloseAutoFocus?.(event);
      if (event.defaultPrevented) return;
      event.preventDefault();
      // Let layout cleanup and inert updates commit before returning focus.
      queueMicrotask(() => {
        if (stack.store.focusTop()) return;
        const previous = instance.triggerRef.current ?? opener.current;
        const target =
          previous?.isConnected && !previous.closest("[inert]") ? previous : stack.pageRef.current;
        target?.focus({ preventScroll: true });
      });
    },
  };
}
