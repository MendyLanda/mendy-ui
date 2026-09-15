"use client";

import type { ReactNode } from "react";
import { useMendyLocale } from "../locale-context.js";
import { cn } from "../utils.js";
import { useFillLayout } from "./use-fill-layout.js";

/** Shared sizing for the composed view and the table with built-in controls. */
export function TableFrame({
  layout,
  minHeight = 240,
  stretch = false,
  slot = "table-view",
  header,
  footer,
  children,
}: {
  layout: "content" | "fill";
  minHeight?: number;
  stretch?: boolean;
  slot?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { direction, code, configured } = useMendyLocale();
  const fill = layout === "fill";
  const ref = useFillLayout(fill, minHeight);
  return (
    <div
      ref={ref}
      data-mendy-ui=""
      data-slot={slot}
      dir={configured ? direction : undefined}
      lang={code}
      data-layout={layout}
      className={cn("min-w-0", fill ? "flex min-h-0 flex-col gap-2" : "space-y-2")}
      style={fill ? { height: minHeight, minHeight } : stretch ? { height: "100%" } : undefined}
    >
      {header && <div className="shrink-0">{header}</div>}
      <div
        className={fill ? "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)]" : undefined}
        style={!fill && stretch ? { height: "100%" } : undefined}
      >
        {children}
      </div>
      {footer && <div className="shrink-0 space-y-2">{footer}</div>}
    </div>
  );
}
