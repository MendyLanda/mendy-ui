"use client";
import { useContext, useLayoutEffect, useRef } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "../customization.js";
import { useMendyLocale } from "../locale-context.js";
import { SheetControlsContext, SheetStackContext } from "./context.js";
import type { SheetGuardMessages } from "./context.js";

/** Inline messages are safe. Dirty form changes do not rerender the sheet stack. */
export function useSheetCloseGuard(dirty: boolean, messages?: SheetGuardMessages) {
  const registerGuard = useContext(SheetControlsContext)?.registerGuard;
  const current = useRef({ dirty, messages });
  useLayoutEffect(() => {
    current.current = { dirty, messages };
  });
  useLayoutEffect(() => registerGuard?.(() => current.current), [registerGuard]);
}
export function CloseConfirmation({
  open,
  messages,
  onCancel,
  onDiscard,
  onPin,
}: {
  open: boolean;
  messages?: SheetGuardMessages;
  onCancel: () => void;
  onDiscard: () => void;
  onPin?: () => void;
}) {
  const { t, direction } = useMendyLocale();
  const stack = useContext(SheetStackContext)!;
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialog.Portal container={stack.container}>
        <AlertDialog.Overlay
          data-mendy-ui=""
          className="pointer-events-auto fixed inset-0 z-[70] bg-background/80"
        />
        <AlertDialog.Content
          data-mendy-ui=""
          dir={direction}
          className="pointer-events-auto fixed start-1/2 top-1/2 z-[71] grid w-[calc(100%-2rem)] max-w-md gap-4 rounded-lg border bg-popover p-6 text-popover-foreground shadow-lg outline-none"
          style={{ transform: `translate(${direction === "rtl" ? "50%" : "-50%"}, -50%)` }}
        >
          <AlertDialog.Title className="text-lg font-semibold">
            {messages?.title ?? t("sheetUnsavedTitle")}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted-foreground">
            {messages?.description ??
              t(onPin ? "sheetUnsavedPinDescription" : "sheetUnsavedDescription")}
          </AlertDialog.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="outline">{messages?.cancel ?? t("sheetKeepEditing")}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="destructive" onClick={onDiscard}>
                {messages?.confirm ?? t("sheetDiscard")}
              </Button>
            </AlertDialog.Action>
            {onPin && (
              <AlertDialog.Action asChild>
                <Button onClick={onPin}>{t("sheetPin")}</Button>
              </AlertDialog.Action>
            )}
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
