import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import { csvValue, tsvValue } from "./state.js";

export const interactiveSelector =
  'button, a, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="checkbox"], [role="button"], [role="textbox"]';
export function selectedCellsText<T extends object>(table: DataTableInstance<T>): string {
  const selected = new Set(table.getSelectedCellIds());
  const rows = table
    .getRowsInDisplayOrder()
    .filter((row) => row.getVisibleCells().some((cell) => selected.has(cell.id)));
  const columns = new Set(
    rows.flatMap((row) =>
      row
        .getVisibleCells()
        .filter((cell) => selected.has(cell.id))
        .map((cell) => cell.column.id),
    ),
  );
  return rows
    .map((row) =>
      row
        .getVisibleCells()
        .filter((cell) => columns.has(cell.column.id))
        .map((cell) => {
          if (!selected.has(cell.id)) return "";
          const definition = cell.column.columnDef as TableColumn<T>;
          return tsvValue(
            definition.copyValue?.(row.original) ??
              definition.getCellValue?.(row.original) ??
              String(cell.getValue() ?? ""),
          );
        })
        .join("\t"),
    )
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
