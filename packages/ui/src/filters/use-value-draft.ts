"use client";

import { createContext, useContext, useLayoutEffect, useState } from "react";
import { equalValues } from "./filter-definition.js";

interface SavedDraft {
  value: unknown;
  draft: unknown;
}
export type DraftCache = Map<string, SavedDraft>;
export const FilterDraftCache = createContext<DraftCache | null>(null);

/** Keep a menu-session draft until its committed value changes. Outside a menu, state stays local. */
export function useValueDraft<V, D>(value: V, createDraft: (value: V) => D, key?: string) {
  const cache = useContext(FilterDraftCache);
  const [state, setState] = useState(() => {
    const saved = key ? cache?.get(key) : undefined;
    return {
      value,
      draft: saved && equalValues(saved.value, value) ? (saved.draft as D) : createDraft(value),
    };
  });
  let current = state;
  if (!equalValues(state.value, value)) {
    current = { value, draft: createDraft(value) };
    setState(current);
  }
  useLayoutEffect(() => {
    if (key) cache?.set(key, current);
  });
  function setDraft(draft: D) {
    const next = { value, draft };
    if (key) cache?.set(key, next);
    setState(next);
  }
  return [current.draft, setDraft] as const;
}
