import type { CSSProperties } from "react";
import type { Column } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";

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
  const totalWidth = columns.reduce((sum, column) => sum + column.getSize(), 0);
  const pinnedWidth = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ].reduce((sum, column) => sum + column.getSize(), 0);
  // Preserve stored pins, but leave room to reach the middle columns on narrow screens.
  const pinningActive = (viewportWidth ?? Infinity) >= Math.min(totalWidth, pinnedWidth + 120);
  const positions = new Map<string, { side: "left" | "right"; offset: number }>();
  let offset = 0;
  for (const column of table.getStartVisibleLeafColumns()) {
    positions.set(column.id, { side: "left", offset });
    offset += column.getSize();
  }
  offset = 0;
  for (const column of [...table.getEndVisibleLeafColumns()].reverse()) {
    positions.set(column.id, { side: "right", offset });
    offset += column.getSize();
  }
  function cellStyle(column: Column<DataTableFeatures, T>): CSSProperties {
    const pin = pinningActive ? positions.get(column.id) : undefined;
    return {
      width: column.getSize(),
      minWidth: column.getSize(),
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
    };
  }
  return { columns, totalWidth, pinningActive, cellStyle };
}
