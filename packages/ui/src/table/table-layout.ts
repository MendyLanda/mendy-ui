import type { CSSProperties } from "react";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import { distributeColumnWidths } from "./column-widths.js";

/** Keep headers, skeletons, and loaded cells on the same column geometry. */
export function tableLayout<T extends object>(
  table: DataTableInstance<T>,
  viewportWidth: number | null,
  rowHeight: number,
) {
  const columns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  const widths = distributeColumnWidths(
    columns.map((column) => {
      const definition = column.columnDef as TableColumn<T>;
      return {
        id: column.id,
        size: column.getSize(),
        maxSize: definition.maxSize ?? 1200,
        grow: Object.hasOwn(table.state.columnSizing, column.id)
          ? false
          : (definition.grow ?? (column.accessorFn ? 1 : false)),
      };
    }),
    viewportWidth,
  );
  const size = (column: Column<DataTableFeatures, T>) => widths.get(column.id)!;
  const totalWidth = columns.reduce((sum, column) => sum + size(column), 0);
  const pinnedWidth = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ].reduce((sum, column) => sum + size(column), 0);
  // Preserve stored pins, but leave room to reach the middle columns on narrow screens.
  const pinningActive = (viewportWidth ?? Infinity) >= Math.min(totalWidth, pinnedWidth + 120);
  const positions = new Map<string, { side: "left" | "right"; offset: number }>();
  let offset = 0;
  for (const column of table.getStartVisibleLeafColumns()) {
    positions.set(column.id, { side: "left", offset });
    offset += size(column);
  }
  offset = 0;
  for (const column of [...table.getEndVisibleLeafColumns()].reverse()) {
    positions.set(column.id, { side: "right", offset });
    offset += size(column);
  }
  const styles = new Map<string, CSSProperties>();
  const offsets = [0];
  for (const column of columns) {
    offsets.push(offsets.at(-1)! + size(column));
    const pin = pinningActive ? positions.get(column.id) : undefined;
    styles.set(column.id, {
      width: size(column),
      minWidth: size(column),
      height: rowHeight,
      ...(column.id === table.getEndVisibleLeafColumns()[0]?.id
        ? { marginInlineStart: "auto" }
        : {}),
      ...(pin
        ? {
            position: "sticky",
            [pin.side]: pin.offset,
            zIndex: 2,
            ...(column.id === table.getStartVisibleLeafColumns().at(-1)?.id
              ? { borderRightWidth: 4 }
              : {}),
            ...(column.id === table.getEndVisibleLeafColumns()[0]?.id
              ? { borderLeftWidth: 4 }
              : {}),
          }
        : {}),
    });
  }
  const cellStyle = (column: Column<DataTableFeatures, T>) => styles.get(column.id)!;
  return { columns, totalWidth, pinningActive, cellStyle, offsets };
}
