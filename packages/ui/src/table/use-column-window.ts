"use client";
import type { RefObject } from "react";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { tableLayout } from "./table-layout.js";
import { useLayoutEffect, useState } from "react";

/** Keep pinned and focused columns mounted, with two columns of overscan. */
export function useColumnWindow<T extends object>(
  layout: ReturnType<typeof tableLayout<T>>,
  container: RefObject<HTMLDivElement | null>,
  focusedColumn?: string,
) {
  const [range, setRange] = useState({ start: 0, end: 12 });
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
    const measure = () => {
      const left = element.scrollLeft;
      const right = left + element.clientWidth;
      let start = 0;
      let end = layout.columns.length - 1;
      while (start < end && layout.offsets[start + 1] < left) start++;
      end = start;
      while (end < layout.columns.length - 1 && layout.offsets[end] < right) end++;
      start = Math.max(0, start - 2);
      end = Math.min(layout.columns.length - 1, end + 2);
      setRange((old) => (old.start === start && old.end === end ? old : { start, end }));
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    return () => element.removeEventListener("scroll", measure);
  }, [layout, container]);
  const columns: Column<DataTableFeatures, T>[] = [];
  const styles = new Map<string, ReturnType<typeof layout.cellStyle>>();
  let previousEnd = 0;
  layout.columns.forEach((column, index) => {
    if (
      (index >= range.start && index <= range.end) ||
      (layout.pinningActive && column.getIsPinned()) ||
      column.id === focusedColumn ||
      column.id === activeColumn
    ) {
      columns.push(column);
      const gap = layout.offsets[index] - previousEnd;
      styles.set(column.id, {
        ...layout.cellStyle(column),
        ...(gap > 0 ? { marginInlineStart: gap } : {}),
      });
      previousEnd = layout.offsets[index + 1];
    }
  });
  return { columns, cellStyle: (column: Column<DataTableFeatures, T>) => styles.get(column.id)! };
}
