import type {
  ColumnPinningState,
  ColumnSizingState,
  ColumnVisibilityState,
  SortingState,
} from "@tanstack/react-table";
import type { TableColumn } from "./columns.js";

export interface TablePreferences {
  version: 1;
  columnOrder: string[];
  columnVisibility: ColumnVisibilityState;
  columnSizing: ColumnSizingState;
  columnPinning: ColumnPinningState;
}
export interface PreferenceStorage {
  read: (key: string) => unknown | Promise<unknown>;
  write: (key: string, value: TablePreferences) => void | Promise<void>;
}
export interface SavedTableView<F = unknown> {
  id: string;
  name: string;
  filters: F;
  sorting: SortingState;
  preferences: TablePreferences;
}
export type TableSelection<Q = unknown> =
  | { mode: "ids"; ids: string[] }
  | { mode: "matching"; scope: Q; excludedIds: string[] };

export function reconcilePreferences<T extends object>(
  input: unknown,
  columns: readonly TableColumn<T>[],
  defaults?: Partial<TablePreferences>,
): TablePreferences {
  const ids = columns.map((c) => c.id ?? ("accessorKey" in c ? String(c.accessorKey) : ""));
  const allowed = new Set(ids);
  const byId = new Map(columns.map((column, index) => [ids[index], column]));
  const raw =
    input && typeof input === "object" && "version" in input && input.version === 1
      ? (input as Partial<TablePreferences>)
      : (defaults ?? {});
  const order = [
    ...new Set(
      Array.isArray(raw.columnOrder)
        ? raw.columnOrder.filter((v) => typeof v === "string" && allowed.has(v))
        : [],
    ),
  ];
  const visibility = Object.fromEntries(
    columns
      .filter((c) => c.defaultHidden && c.enableHiding !== false)
      .map((c) => [c.id ?? String("accessorKey" in c ? c.accessorKey : ""), false]),
  );
  const sizes: ColumnSizingState = {};
  for (const [id, v] of Object.entries(raw.columnVisibility ?? {}))
    if (allowed.has(id) && byId.get(id)?.enableHiding !== false && typeof v === "boolean")
      visibility[id] = v;
  for (const [id, v] of Object.entries(raw.columnSizing ?? {})) {
    const column = byId.get(id);
    if (column && typeof v === "number" && Number.isFinite(v))
      sizes[id] = Math.min(column.maxSize ?? 1200, Math.max(column.minSize ?? 48, v));
  }
  const pin = (side: "start" | "end") => [
    ...new Set(
      (Array.isArray(raw.columnPinning?.[side])
        ? raw.columnPinning[side]!
        : columns.filter((c) => c.pin === side).map((c) => c.id!)
      ).filter((id) => allowed.has(id)),
    ),
  ];
  const start = pin("start");
  const ordered = new Set(order);
  const startSet = new Set(start);
  return {
    version: 1,
    columnOrder: [...order, ...ids.filter((id) => !ordered.has(id))],
    columnVisibility: visibility,
    columnSizing: sizes,
    columnPinning: { start, end: pin("end").filter((id) => !startSet.has(id)) },
  };
}
export function csvValue(value: string): string {
  // Spreadsheet programs interpret formula prefixes even in quoted CSV fields.
  const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function tsvValue(value: string): string {
  return /["\t\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}
