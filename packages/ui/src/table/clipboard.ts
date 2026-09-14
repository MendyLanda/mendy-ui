import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import { constructCell } from "@tanstack/react-table";
import { csvValue, tsvValue } from "./state.js";

export const interactiveSelector =
  'button, a, summary, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="checkbox"], [role="button"], [role="textbox"]';
export function selectedCellsText<T extends object>(table: DataTableInstance<T>): string {
  const rows = table.getRowsInDisplayOrder();
  const columns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  // Bounds already resolve include/exclude operations in display order. Visiting
  // only these cells avoids materializing every column of every selected row.
  const values = new Map<number, Map<number, string>>();
  const includedColumns = new Set<number>();
  for (const bounds of table.getCellSelectionBounds()) {
    for (let r = bounds.minRowIndex; r <= bounds.maxRowIndex; r++) {
      const row = rows[r];
      for (let c = bounds.minColumnIndex; c <= bounds.maxColumnIndex; c++) {
        const column = columns[c];
        const cell = constructCell(column, row, row.table);
        if (!cell.getCanSelect()) continue;
        const definition = column.columnDef as TableColumn<T>;
        let rowValues = values.get(r);
        if (!rowValues) values.set(r, (rowValues = new Map()));
        rowValues.set(
          c,
          tsvValue(
            definition.copyValue?.(row.original) ??
              definition.getCellValue?.(row.original) ??
              String(cell.getValue() ?? ""),
          ),
        );
        includedColumns.add(c);
      }
    }
  }
  const columnIndexes = [...includedColumns].sort((a, b) => a - b);
  return [...values]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => columnIndexes.map((c) => row.get(c) ?? "").join("\t"))
    .join("\n");
}
export function tableCsv<T extends object>(
  table: DataTableInstance<T>,
  options: { selectedOnly?: boolean } = {},
): string {
  const columns = table.getVisibleLeafColumns().flatMap((column) => {
    const definition = column.columnDef as TableColumn<T>;
    if (definition.exportOptions === false) return [];
    if (definition.exportOptions)
      return Array.isArray(definition.exportOptions)
        ? definition.exportOptions
        : [definition.exportOptions];
    return [
      {
        header:
          definition.label ??
          (typeof definition.header === "string" ? definition.header : column.id),
        value: (row: T) => definition.copyValue?.(row) ?? String(column.accessorFn?.(row, 0) ?? ""),
      },
    ];
  });
  const rows = table
    .getRowsInDisplayOrder()
    .filter((row) => !options.selectedOnly || row.getIsSelected());
  return [
    columns.map((column) => csvValue(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => csvValue(column.value(row.original))).join(",")),
  ].join("\r\n");
}
