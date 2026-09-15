import { useMendyLocale } from "../locale-context.js";
import type { CSSProperties } from "react";
import { Fragment } from "react";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";

/** Loading shares the live column geometry and its single scroll container. */
export function TableLoadingRows<T extends object>({
  columns,
  columnGaps,
  count,
  width,
  rowHeight,
  cellStyle,
}: {
  columns: Column<DataTableFeatures, T>[];
  columnGaps: Map<string, number>;
  count: number;
  width: number;
  rowHeight: number;
  cellStyle: (column: Column<DataTableFeatures, T>) => CSSProperties;
}) {
  const { t } = useMendyLocale();
  return (
    <div role="status" aria-label={t("loadingRows")} className="min-w-full" style={{ width }}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          data-slot="table-loading-row"
          className="flex min-w-full"
          style={{ height: rowHeight }}
        >
          {columns.map((column) => (
            <Fragment key={column.id}>
              {columnGaps.has(column.id) && (
                <div
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ width: columnGaps.get(column.id) }}
                />
              )}
              <div
                key={column.id}
                data-slot="table-loading-cell"
                data-column-id={column.id}
                className="flex shrink-0 items-center border-b border-e bg-background px-3"
                style={cellStyle(column)}
              >
                <div className="h-3 w-2/3 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
              </div>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
