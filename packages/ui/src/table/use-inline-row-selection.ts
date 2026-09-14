import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";
import { useMemo } from "react";

export function useInlineRowSelection<T extends object>(
  table: DataTableInstance<T>,
  columns: Column<DataTableFeatures, T>[],
  controls: boolean,
) {
  const rows = table.getRowModel().rows;
  const inlineSelection = Boolean(
    controls &&
    table.options.enableRowSelection &&
    !columns.some((column) => column.id === "_selection"),
  );
  const rowSelection = table.state.rowSelection;
  const enableRowSelection = table.options.enableRowSelection;
  const enableMultiRowSelection = table.options.enableMultiRowSelection;
  const selectLoadedAvailability = useMemo(() => {
    if (!inlineSelection || enableMultiRowSelection === false) return undefined;
    let hasSelectableRow = false;
    for (const row of rows) {
      if (!row.getCanSelect()) continue;
      hasSelectableRow = true;
      if (!row.getCanMultiSelect()) return undefined;
    }
    return { disabled: !hasSelectableRow };
  }, [rows, inlineSelection, enableRowSelection, enableMultiRowSelection]);
  const selectLoaded = useMemo(() => {
    if (!selectLoadedAvailability) return undefined;
    return {
      checked:
        table.getIsAllPageRowsSelected() ||
        (table.getIsSomePageRowsSelected() ? ("indeterminate" as const) : false),
      disabled: selectLoadedAvailability.disabled,
    };
  }, [table, rowSelection, selectLoadedAvailability]);
  return { inlineSelection, selectLoaded };
}
