"use client";

import { useSearchDraft } from "./use-search-draft.js";

export interface FilterSearchOptions {
  /** Applied filters or another scope whose external changes discard unfinished typing. */
  context?: string;
  /** Normalize applied queries while preserving the exact text in the input. */
  normalize?: (search: string) => string;
}

/** Buffer standalone search inputs; FilterRoot and FilterBar do this automatically. */
export function useFilterSearch(
  value: string | null | undefined,
  onChange: (value: string | null) => void,
  delay = 300,
  options: FilterSearchOptions = {},
) {
  const draft = useSearchDraft({
    ...options,
    value: value ?? "",
    onApply: (search) => onChange(search || null),
    delay,
  });
  return { value: draft.value, setValue: draft.setValue, flush: draft.flush };
}
