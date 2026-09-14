import type { CSSProperties } from "react";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";

/** Loading shares the live column geometry and its single scroll container. */
export function TableLoadingRows<T extends object>({
  columns,
  count,
  width,
  rowHeight,
  cellStyle,
}: {
  columns: Column<DataTableFeatures, T>[];
  count: number;
  width: number;
  rowHeight: number;
  cellStyle: (column: Column<DataTableFeatures, T>) => CSSProperties;
}) {
  return (
    <div role="status" aria-label="Loading rows" className="min-w-full" style={{ width }}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          data-slot="table-loading-row"
          className="flex min-w-full"
          style={{ height: rowHeight }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              data-slot="table-loading-cell"
              data-column-id={column.id}
              className="flex shrink-0 items-center border-b border-e bg-background px-3"
              style={cellStyle(column)}
            >
              <div className="h-3 w-2/3 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
