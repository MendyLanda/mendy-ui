import type { Row } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { TableColumn } from "./columns.js";
import type { UseDataTableOptions } from "./use-data-table.js";

/** Read a record description without mounting its cell renderer or allocating every cell. */
export function rowSelectionLabel<T extends object>(
  row: Row<DataTableFeatures, T>,
): string | number {
  const { getRowLabel } = row.table.options as typeof row.table.options &
    Pick<UseDataTableOptions<T>, "getRowLabel">;
  if (getRowLabel) return getRowLabel(row.original);
  const column = row.table.getVisibleLeafColumns().find((column) => column.accessorFn);
  if (column) {
    const definition = column.columnDef as TableColumn<T>;
    const value = definition.copyValue?.(row.original) ?? row.getValue(column.id);
    if ((typeof value === "string" && value.trim()) || typeof value === "number") return value;
  }
  return row.index + 1;
}
