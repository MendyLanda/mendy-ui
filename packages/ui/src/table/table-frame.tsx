"use client";

import type { ReactNode } from "react";
import { cn } from "../utils.js";
import { useFillLayout } from "./use-fill-layout.js";

/** Shared sizing for the composed view and the table with built-in controls. */
export function TableFrame({
  layout,
  stretch = false,
  slot = "table-view",
  header,
  footer,
  children,
}: {
  layout: "content" | "fill";
  stretch?: boolean;
  slot?: string;
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const fill = layout === "fill";
  const ref = useFillLayout(fill);
  return (
    <div
      ref={ref}
      data-mendy-ui=""
      data-slot={slot}
      data-layout={layout}
      className={cn("min-w-0", fill ? "flex min-h-0 flex-col gap-2" : "space-y-2")}
      style={!fill && stretch ? { height: "100%" } : undefined}
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
