"use client";
import type { ComponentProps, CSSProperties } from "react";
import { useContext } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { useMendyLocale } from "../locale-context.js";
import { cn } from "../utils.js";
import { SheetStackContext, useSheetInstance } from "./context.js";
import type { SheetLayout, SheetSide } from "./types.js";
import { useSheetFocus } from "./use-sheet-focus.js";
export interface SheetContentProps extends ComponentProps<typeof Dialog.Content> {
  /** Disable opening and repositioning motion for this sheet. */
  animation?: boolean;
}
export function SheetContent({
  children,
  className,
  style,
  animation,
  onEscapeKeyDown,
  onInteractOutside,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ref,
  ...props
}: SheetContentProps) {
  const stack = useContext(SheetStackContext)!;
  const instance = useSheetInstance();
  const { direction, code } = useMendyLocale();
  const layout = instance.layout;

  const hasAnimation = animation ?? stack.animation;
  const covered = Boolean(layout?.covered);
  const focus = useSheetFocus({ onOpenAutoFocus, onCloseAutoFocus });
  if (!stack.container) return null;
  return (
    <Dialog.Portal container={stack.container}>
      <Dialog.Content
        {...props}
        ref={(node) => {
          instance.contentRef.current = node;
          if (typeof ref === "function") return ref(node);
          if (ref) ref.current = node;
        }}
        data-mendy-ui=""
        data-mendy-sheet-content=""
        data-sheet-id={instance.id}
        data-side={instance.side}
        data-pinned={layout?.pinned || undefined}
        data-covered={covered || undefined}
        dir={direction}
        lang={code}
        aria-hidden={covered || undefined}
        inert={covered || undefined}
        aria-modal={layout?.modal || undefined}
        aria-describedby={
          Object.hasOwn(props, "aria-describedby")
            ? props["aria-describedby"]
            : instance.descriptionId
        }
        {...presentation(instance, direction, hasAnimation, className, style)}
        onOpenAutoFocus={focus.onOpen}
        onCloseAutoFocus={focus.onClose}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event);
          if (event.defaultPrevented) return;
          event.preventDefault();
          stack.store.closeTop("escape");
        }}
        onInteractOutside={(event) => {
          onInteractOutside?.(event);
          // The shared backdrop dismisses exactly one sheet, never a neighboring sheet or popup.
          event.preventDefault();
        }}
      >
        <FocusScope
          asChild
          loop={layout?.modal}
          trapped={layout?.modal && instance.open}
          onMountAutoFocus={(event) => event.preventDefault()}
          onUnmountAutoFocus={(event) => event.preventDefault()}
        >
          <div
            className={cn(
              "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-background text-foreground shadow-lg",
              layout?.pinned && "rounded-none shadow-none",
            )}
          >
            {children}
          </div>
        </FocusScope>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function presentation(
  { layout, width, side }: { layout?: SheetLayout; width: number; side: SheetSide },
  direction: string,
  hasAnimation: boolean,
  className?: string,
  style?: CSSProperties,
): { className: string; style: CSSProperties } {
  const covered = Boolean(layout?.covered);
  return {
    className: cn(
      "pointer-events-auto fixed inset-y-0 flex min-w-0 flex-col p-0 outline-none md:p-4",
      layout?.pinned && "md:p-0",
      hasAnimation &&
        "transition-[inset-inline-start,inset-inline-end] duration-300 motion-reduce:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=closed]:duration-200 data-[state=open]:motion-reduce:animate-none data-[state=closed]:motion-reduce:animate-none",
      hasAnimation &&
        (side === "end") === (direction === "ltr") &&
        "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
      hasAnimation &&
        (side === "start") === (direction === "ltr") &&
        "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
      className,
    ),
    style: {
      ...style,
      width: layout?.width ?? width,
      maxWidth: style?.maxWidth ?? "100vw",
      insetInlineStart: side === "start" ? (layout?.offset ?? 0) : undefined,
      insetInlineEnd: side === "end" ? (layout?.offset ?? 0) : undefined,
      zIndex: layout?.pinned ? 60 : layout?.top ? 52 : 51,
      visibility: covered ? "hidden" : undefined,
    },
  };
}
