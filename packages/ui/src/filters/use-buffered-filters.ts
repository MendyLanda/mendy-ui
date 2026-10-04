"use client";

import type { FilterController } from "./use-filters.js";
import type { FilterEntry } from "./filter-state.js";
import type { RuntimeField } from "./filter-definition.js";
import { filterControllerActions } from "./filter-controller-actions.js";
import { useSearchDraft } from "./use-search-draft.js";

const trim = (search: string) => search.trim();
function contextValue(field: RuntimeField, value: unknown) {
  return value == null ? null : field.codec.serialize(value);
}
function filterContext(entries: FilterEntry[], changes: Record<string, unknown> = {}) {
  return JSON.stringify(
    entries.map(({ id, field, value }) => [
      id,
      contextValue(field, id in changes && !field.disabled ? field.normalize(changes[id]) : value),
    ]),
  );
}

function filterAcknowledgement(entries: FilterEntry[], changes: Record<string, unknown>) {
  const expected = entries.flatMap(({ id, field }): [string, string | null][] =>
    id in changes && !field.disabled
      ? [[id, contextValue(field, field.normalize(changes[id]))]]
      : [],
  );
  if (!expected.length) return undefined;
  return (context: string) => {
    const applied = new Map<string, unknown>(JSON.parse(context));
    return (
      applied.size === entries.length &&
      entries.every(({ id }) => applied.has(id)) &&
      expected.every(([id, value]) => applied.get(id) === value)
    );
  };
}

/** Root-local draft; the caller's controller always exposes the applied search. */
export function useBufferedFilters(filters: FilterController, delay: number) {
  const draft = useSearchDraft({
    value: filters.search,
    context: filterContext(filters.entries),
    onApply: filters.setSearch,
    normalize: trim,
    delay,
  });
  const batch: FilterController["batch"] = (changes, search, source = "edit") => {
    if (source === "search") {
      draft.setValue(search ?? draft.value);
      return;
    }
    // Validation belongs to the applied controller. Invalid editors keep their draft.
    const result = filters.batch(changes, trim(search ?? draft.value), source);
    if (result) return result;
    // Bindings can update related fields in the same patch. Match the requested
    // fields while allowing those domain updates in the acknowledgement.
    draft.apply(
      search ?? draft.value,
      () => {},
      filterContext(filters.entries, changes),
      filterAcknowledgement(filters.entries, changes),
    );
  };
  if (delay <= 0) return { filters, flushSearch: () => {} };
  return {
    filters: {
      ...filters,
      ...filterControllerActions({ ...filters, search: draft.value, batch }),
      search: draft.value,
      setSearch: draft.setValue,
      batch,
    },
    flushSearch: draft.flush,
  };
}
