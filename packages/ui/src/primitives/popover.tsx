"use client";
import type { ComponentProps } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useMendyUI } from "../customization.js";
import { cn } from "../utils.js";
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal container={useMendyUI().portalContainer}>
      <PopoverPrimitive.Content
        data-mendy-ui=""
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-h-(--radix-popover-content-available-height) w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
