"use client";
import type { RefObject } from "react";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { tableLayout } from "./table-layout.js";
import { useLayoutEffect, useMemo, useState } from "react";

/** Keep pinned and focused columns mounted, with two columns of overscan. */
export function useColumnWindow<T extends object>(
  layout: ReturnType<typeof tableLayout<T>>,
  container: RefObject<HTMLDivElement | null>,
  viewportWidth: number | null,
  focusedColumn?: string,
  enabled = true,
) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeColumn, setActiveColumn] = useState<string>();
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const rememberFocus = (event: FocusEvent) => {
      setActiveColumn(
        (event.target as Element).closest<HTMLElement>("[data-column-id]")?.dataset.columnId,
      );
    };
    element.addEventListener("focusin", rememberFocus);
    return () => element.removeEventListener("focusin", rememberFocus);
  }, [container]);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setScrollLeft(element.scrollLeft);
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    return () => element.removeEventListener("scroll", measure);
  }, [container]);
  const right = scrollLeft + (viewportWidth ?? 0);
  let start = 0;
  let end = layout.columns.length - 1;
  while (start < end && layout.offsets[start + 1] < scrollLeft) start++;
  end = start;
  while (end < layout.columns.length - 1 && layout.offsets[end] < right) end++;
  start = Math.max(0, start - 2);
  end = Math.min(layout.columns.length - 1, end + 2);
  return useMemo(() => {
    const columns: Column<DataTableFeatures, T>[] = [];
    const columnGaps = new Map<string, number>();
    const styles = new Map<string, ReturnType<typeof layout.cellStyle>>();
    let previousEnd = 0;
    layout.columns.forEach((column, index) => {
      if (
        !enabled ||
        (index >= start && index <= end) ||
        (layout.pinningActive && column.getIsPinned()) ||
        column.id === focusedColumn ||
        column.id === activeColumn
      ) {
        columns.push(column);
        const gap = layout.offsets[index] - previousEnd;
        const pinnedEnd = layout.pinningActive && column.getIsPinned() === "end";
        if (gap > 0 && pinnedEnd) columnGaps.set(column.id, gap);
        styles.set(column.id, {
          ...layout.cellStyle(column),
          ...(gap > 0 && !pinnedEnd ? { marginInlineStart: gap } : {}),
        });
        previousEnd = layout.offsets[index + 1];
      }
    });
    return {
      columns,
      columnGaps,
      cellStyle: (column: Column<DataTableFeatures, T>) => styles.get(column.id)!,
    };
  }, [layout, start, end, focusedColumn, activeColumn, enabled]);
}
