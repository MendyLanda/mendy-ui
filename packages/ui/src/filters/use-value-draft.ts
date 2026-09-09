"use client";

import { useState } from "react";
import { equalValues } from "./filter-definition.js";

/** Preserve unfinished edits until the application's committed value changes. */
export function useValueDraft<V, D>(value: V, createDraft: (value: V) => D) {
  const [state, setState] = useState(() => ({ value, draft: createDraft(value) }));
  let current = state;
  if (!equalValues(state.value, value)) {
    current = { value, draft: createDraft(value) };
    setState(current);
  }
  function setDraft(draft: D) {
    setState({ value, draft });
  }
  return [current.draft, setDraft] as const;
}
