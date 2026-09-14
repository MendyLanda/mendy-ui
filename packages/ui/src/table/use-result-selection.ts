"use client";
import type { RowSelectionState, Updater } from "@tanstack/react-table";
import type { TableSelection } from "./state.js";
import { useState } from "react";

export function useResultSelection<Q>({
  scope,
  rowIds,
  totalCount,
}: {
  scope: { key: string; value: Q };
  rowIds: readonly string[];
  totalCount?: number;
}) {
  const [stored, setStored] = useState<{ key: string; value: TableSelection<Q> }>({
    key: scope.key,
    value: { mode: "ids", ids: [] },
  });
  if (stored.key !== scope.key) {
    setStored({ key: scope.key, value: { mode: "ids", ids: [] } });
  }
  const selection: TableSelection<Q> =
    stored.key === scope.key ? stored.value : { mode: "ids", ids: [] };
  const ids = new Set(selection.mode === "ids" ? selection.ids : selection.excludedIds);
  const rowSelection: RowSelectionState = Object.fromEntries(
    rowIds
      .filter((id) => (selection.mode === "ids" ? ids.has(id) : !ids.has(id)))
      .map((id) => [id, true]),
  );
  function onRowSelectionChange(updater: Updater<RowSelectionState>) {
    setStored((previous) => {
      const value: TableSelection<Q> =
        previous.key === scope.key ? previous.value : { mode: "ids", ids: [] };
      const selected = new Set(value.mode === "ids" ? value.ids : value.excludedIds);
      const current: RowSelectionState = Object.fromEntries(
        rowIds
          .filter((id) => (value.mode === "ids" ? selected.has(id) : !selected.has(id)))
          .map((id) => [id, true]),
      );
      const next = typeof updater === "function" ? updater(current) : updater;
      for (const id of rowIds) {
        if (value.mode === "ids" ? next[id] : !next[id]) selected.add(id);
        else selected.delete(id);
      }
      return {
        key: scope.key,
        value:
          value.mode === "ids"
            ? { mode: "ids", ids: [...selected] }
            : { ...value, excludedIds: [...selected] },
      };
    });
  }
  return {
    selection,
    rowSelection,
    onRowSelectionChange,
    count:
      selection.mode === "ids"
        ? selection.ids.length
        : totalCount == null
          ? undefined
          : Math.max(0, totalCount - selection.excludedIds.length),
    clear: () => setStored({ key: scope.key, value: { mode: "ids", ids: [] } }),
    selectAllMatching: () =>
      setStored({
        key: scope.key,
        value: { mode: "matching", scope: scope.value, excludedIds: [] },
      }),
  };
}
