interface WidthColumn {
  id: string;
  size: number;
  maxSize: number;
  grow: number | false;
}

/** Allocate spare space without changing stored or user-resized column widths. */
export function distributeColumnWidths(columns: WidthColumn[], viewport: number | null) {
  const widths = new Map(columns.map((column) => [column.id, column.size]));
  let spare = (viewport ?? 0) - columns.reduce((sum, column) => sum + column.size, 0);
  let flexible = columns.filter(
    (column) =>
      typeof column.grow === "number" &&
      Number.isFinite(column.grow) &&
      column.grow > 0 &&
      column.maxSize > column.size,
  );
  while (spare > 0.01 && flexible.length) {
    const unit = flexible.reduce((max, column) => Math.max(max, Number(column.grow)), 0);
    const weight = flexible.reduce((sum, column) => sum + Number(column.grow) / unit, 0);
    let used = 0;
    for (const column of flexible) {
      const size = widths.get(column.id)!;
      const extra = Math.min(column.maxSize - size, spare * (Number(column.grow) / unit / weight));
      widths.set(column.id, size + extra);
      used += extra;
    }
    spare -= used;
    flexible = flexible.filter((column) => column.maxSize - widths.get(column.id)! > 0.01);
  }
  return widths;
}
