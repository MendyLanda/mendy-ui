"use client";
import type { ReactNode } from "react";
import type { UseDataTableOptions, DataTableInstance } from "./use-data-table.js";
import type { TableViewProps } from "./table-view.js";
import { useDataTable } from "./use-data-table.js";
import { TableView } from "./table-view.js";
import { TableColumnSettings, TablePagination } from "./table-controls.js";
import { TableFilters, type TableFiltersProps } from "./table-filters.js";
import { TableFrame } from "./table-frame.js";

type Appearance<T extends object> = Omit<TableViewProps<T>, "table"> & {
  toolbar?: ReactNode;
  footer?: ReactNode;
  showColumnSettings?: boolean;
  showPagination?: boolean;
  /** Customize the built-in filter bar, or render it yourself with false. */
  filterBar?: Omit<TableFiltersProps, "filters"> | false;
};
export type DataTableProps<T extends object> = Appearance<T> &
  (UseDataTableOptions<T> | { table: DataTableInstance<T> });
function ControlledTable<T extends object>({
  table,
  toolbar,
  footer,
  showColumnSettings = true,
  showPagination = false,
  filters,
  filterBar,
  layout = "content",
  ...view
}: Appearance<T> & { table: DataTableInstance<T> }) {
  const fill = layout === "fill";
  return (
    <TableFrame
      layout={layout}
      slot="data-table"
      header={
        (toolbar || showColumnSettings || (filters && filterBar !== false)) && (
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              {filters && filterBar !== false && <TableFilters {...filterBar} filters={filters} />}
              {!filters && toolbar}
            </div>
            {filters && toolbar}
            {showColumnSettings && <TableColumnSettings table={table} />}
          </div>
        )
      }
      footer={
        showPagination || footer ? (
          <>
            {showPagination && (
              <div className="shrink-0">
                <TablePagination
                  table={table}
                  loading={view.status === "loading" || view.refreshing}
                />
              </div>
            )}
            {footer}
          </>
        ) : undefined
      }
    >
      <TableView table={table} filters={filters} {...view} height={fill ? "100%" : view.height} />
    </TableFrame>
  );
}
function ConfiguredTable<T extends object>(props: Appearance<T> & UseDataTableOptions<T>) {
  const table = useDataTable(props);
  return (
    <ControlledTable
      {...props}
      table={table}
      showPagination={props.showPagination ?? props.processing?.pagination === "client"}
    />
  );
}
export function DataTable<T extends object>(props: DataTableProps<T>) {
  return "table" in props ? <ControlledTable {...props} /> : <ConfiguredTable {...props} />;
}
