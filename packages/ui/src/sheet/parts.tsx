"use client";
import type { ComponentProps, ReactNode } from "react";
import { useContext, useId, useLayoutEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pin, X } from "lucide-react";
import { Button } from "../customization.js";
import { useMendyLocale } from "../locale-context.js";
import { cn } from "../utils.js";
import { SheetControlsContext, useSheetInstance } from "./context.js";

export function SheetTrigger({ ref, ...props }: ComponentProps<typeof Dialog.Trigger>) {
  const { triggerRef } = useSheetInstance();
  return (
    <Dialog.Trigger
      {...props}
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
    />
  );
}
export { SheetContent } from "./content.js";
export type { SheetContentProps } from "./content.js";
export function SheetClose({ onClick, ...props }: ComponentProps<typeof Dialog.Close>) {
  const instance = useSheetInstance();
  return (
    <Dialog.Close
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        instance.requestClose("close-button");
      }}
    />
  );
}
export function SheetPin({ onClick, ...props }: ComponentProps<typeof Button>) {
  const instance = useSheetInstance();
  const { t } = useMendyLocale();
  if (instance.pinned || !instance.layout?.canPin) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      {...props}
      aria-label={props["aria-label"] ?? t("sheetPin")}
      aria-keyshortcuts="P"
      title={props.title ?? `${t("sheetPin")} (P)`}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) instance.setPinned(true);
      }}
    >
      {props.children ?? <Pin aria-hidden="true" />}
    </Button>
  );
}
export interface SheetHeaderProps extends Omit<ComponentProps<"div">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Extra application actions beside the standard controls. */
  actions?: ReactNode;
  controls?: boolean;
}
export function SheetHeader({
  title,
  description,
  actions,
  controls = true,
  children,
  className,
  ...props
}: SheetHeaderProps) {
  const { t } = useMendyLocale();
  return (
    <div {...props} className={cn("flex shrink-0 items-start gap-3 border-b p-5", className)}>
      <div className="min-w-0 flex-1 space-y-1">
        {title !== undefined && <SheetTitle>{title}</SheetTitle>}
        {description !== undefined && <SheetDescription>{description}</SheetDescription>}
        {children}
      </div>
      {(actions || controls) && (
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {controls && (
            <>
              <SheetPin />
              <SheetClose asChild>
                <Button type="button" variant="ghost" size="icon" aria-label={t("sheetClose")}>
                  <X aria-hidden="true" />
                </Button>
              </SheetClose>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export function SheetTitle({ className, ...props }: ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title {...props} className={cn("text-lg font-semibold", className)} />;
}
export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof Dialog.Description>) {
  const instance = useSheetInstance();
  const generatedId = useId();
  const id = props.id ?? generatedId;
  useLayoutEffect(() => instance.registerDescription(id), [instance.registerDescription, id]);
  return (
    <Dialog.Description
      {...props}
      id={id}
      className={cn("text-sm text-muted-foreground", className)}
    />
  );
}
export function SheetBody({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-5", className)}
    />
  );
}
export function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-2 border-t p-5",
        className,
      )}
    />
  );
}
/** Local sheet controls for custom headers and forms. */
export function useSheet() {
  const value = useContext(SheetControlsContext);
  if (!value) throw new Error("useSheet must be inside a Sheet.");
  return useMemo(
    () => ({
      open: value.open,
      pinned: value.pinned,
      docked: value.docked,
      close: value.close,
      pin: value.pin,
      unpin: value.unpin,
    }),
    [value],
  );
}
