"use client";

import type { TableOptions, ReactTable } from "@tanstack/react-table";
import type { TableColumn } from "./columns.js";
import type { DataTableFeatures } from "./features.js";
import type { PreferenceStorage, TablePreferences } from "./state.js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTable } from "@tanstack/react-table";
import { tableFeaturesDefault } from "./features.js";
import { useStableArray } from "./use-stable-array.js";
import { reconcilePreferences } from "./state.js";

export type DataTableInstance<T extends object> = ReactTable<DataTableFeatures, T>;
export interface UseDataTableOptions<T extends object> extends Omit<
  TableOptions<DataTableFeatures, T>,
  "features" | "data" | "columns" | "manualFiltering" | "manualSorting" | "manualPagination"
> {
  rows: T[];
  columns: TableColumn<T>[];
  getRowId: (row: T, index: number) => string;
  processing?: {
    filtering?: "client" | "external";
    sorting?: "client" | "external";
    pagination?: "client" | "external" | "off";
  };
  preferences?: {
    key: string;
    scope: string;
    storage?: PreferenceStorage;
    onError?: (error: unknown) => void;
  };
}
const browserStorage: PreferenceStorage = {
  read: (key) => {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },
  write: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};
export function captureTablePreferences<T extends object>(
  table: DataTableInstance<T>,
): TablePreferences {
  return {
    version: 1,
    columnOrder: table.state.columnOrder,
    columnPinning: table.state.columnPinning,
    columnSizing: table.state.columnSizing,
    columnVisibility: table.state.columnVisibility,
  };
}
export function applyTablePreferences<T extends object>(
  table: DataTableInstance<T>,
  input: unknown,
) {
  const value = reconcilePreferences(input, table.options.columns as TableColumn<T>[]);
  table.setColumnOrder(value.columnOrder);
  table.setColumnVisibility(value.columnVisibility);
  table.setColumnSizing(value.columnSizing);
  table.setColumnPinning(value.columnPinning);
}
export function useDataTable<T extends object>({
  rows: inputRows,
  columns: inputColumns,
  processing,
  preferences,
  ...options
}: UseDataTableOptions<T>): DataTableInstance<T> {
  const rows = useStableArray(inputRows);
  const columns = useStableArray(inputColumns);
  const defaults = useMemo(
    () => reconcilePreferences(null, columns, options.initialState),
    [columns, options.initialState],
  );
  const table = useTable({
    features: tableFeaturesDefault,
    ...options,
    data: rows,
    columns,
    defaultColumn: { size: 180, minSize: 48, maxSize: 1200, ...options.defaultColumn },
    columnResizeMode: options.columnResizeMode ?? "onChange",
    enableCellSelection: options.enableCellSelection ?? true,
    enableColumnPinning: options.enableColumnPinning ?? true,
    autoResetCellSelection: options.autoResetCellSelection ?? false,
    manualFiltering: processing?.filtering === "external",
    manualSorting: processing?.sorting === "external",
    manualPagination: processing?.pagination !== "client",
    initialState: { ...defaults, ...options.initialState },
  });
  const tableRef = useRef(table);
  const storage = preferences?.storage ?? browserStorage;
  const key = preferences
    ? JSON.stringify(["mendy-table", preferences.scope, preferences.key])
    : null;
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const onError = useRef(preferences?.onError);
  const defaultsRef = useRef(defaults);
  useLayoutEffect(() => {
    tableRef.current = table;
    onError.current = preferences?.onError;
    defaultsRef.current = defaults;
  }, [table, preferences?.onError, defaults]);
  // Persist serialized writes in order, including asynchronous storage adapters.
  const writes = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (!key) return;
    let active = true;
    setRestoredKey(null);
    applyTablePreferences(tableRef.current, defaultsRef.current);
    Promise.resolve()
      .then(() => storage.read(key))
      .then((value) => {
        if (!active) return;
        applyTablePreferences(tableRef.current, value ?? defaultsRef.current);
        setRestoredKey(key);
      })
      .catch((error: unknown) => {
        if (active) {
          onError.current?.(error);
          setRestoredKey(key);
        }
      });
    return () => {
      active = false;
    };
  }, [key, storage]);
  const { columnOrder, columnPinning, columnSizing, columnVisibility } = table.state;
  const serialized = useMemo(
    () =>
      JSON.stringify({
        version: 1,
        columnOrder,
        columnPinning,
        columnSizing,
        columnVisibility,
      }),
    [columnOrder, columnPinning, columnSizing, columnVisibility],
  );
  useEffect(() => {
    if (!key || restoredKey !== key) return;
    const timer = setTimeout(() => {
      const value = JSON.parse(serialized) as TablePreferences;
      writes.current = (writes.current ?? Promise.resolve())
        .then(() => storage.write(key, value))
        .catch((error: unknown) => {
          onError.current?.(error);
        });
    }, 150);
    return () => clearTimeout(timer);
  }, [key, restoredKey, storage, serialized]);
  return table;
}
