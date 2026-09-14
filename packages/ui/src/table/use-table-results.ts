"use client";

import type { FilterController } from "../filters/use-filters.js";
import type { DataTableInstance } from "./use-data-table.js";
import { useMemo } from "react";

function hasValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.some((item) => item != null && item !== "");
  return true;
}

/** Only query state contributes to this key. Row appends and UI state never do. */
export function useTableResults<T extends object>(
  table: DataTableInstance<T>,
  queryKey?: string,
  filters?: FilterController,
) {
  const { sorting, columnFilters, globalFilter, pagination } = table.state;
  const entries = filters?.entries;
  const search = filters?.search;
  const resultKey = useMemo(() => {
    const state = [
      queryKey,
      sorting,
      columnFilters,
      globalFilter,
      pagination.pageIndex,
      pagination.pageSize,
      search,
    ];
    try {
      return JSON.stringify(
        [...state, entries?.map(({ id, field, value }) => [id, field.codec.serialize(value)])],
        (_key, value: unknown) => (typeof value === "bigint" ? { $bigint: String(value) } : value),
      );
    } catch {
      // Opaque application values may not be serializable. In that case their
      // immutable references drive changes, without crashing table rendering.
      return [...state, entries];
    }
  }, [
    queryKey,
    sorting,
    columnFilters,
    globalFilter,
    pagination.pageIndex,
    pagination.pageSize,
    search,
    entries,
  ]);
  const hasFilters = Boolean(
    columnFilters.some(({ value }) => hasValue(value)) ||
    hasValue(globalFilter) ||
    search?.trim() ||
    filters?.active.length,
  );
  const clearFilters = () => {
    if (filters) filters.clear();
    else {
      if (columnFilters.length) table.setColumnFilters([]);
      if (hasValue(globalFilter)) table.setGlobalFilter(undefined);
      if (pagination.pageIndex) table.setPageIndex(0);
    }
  };
  const canClear =
    !filters ||
    Boolean(search?.trim()) ||
    filters.entries.some(
      ({ field, value }) =>
        !field.hidden && !field.disabled && field.removable !== false && field.isActive(value),
    );
  return { resultKey, hasFilters, clearFilters: canClear ? clearFilters : undefined };
}
