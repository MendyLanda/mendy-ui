"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** Debounce URL-backed queries without replacing newer typing with an older URL acknowledgement. */
export function useFilterSearch(
  value: string | null | undefined,
  onChange: (value: string | null) => void,
  delay = 300,
) {
  const committed = value ?? "";
  const [state, setState] = useState({ committed, draft: committed });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string[]>([]);
  const change = useRef(onChange);
  useLayoutEffect(() => {
    change.current = onChange;
  });
  if (state.committed !== committed) {
    setState({
      committed,
      draft: pending.current.includes(committed) ? state.draft : committed,
    });
  }
  useLayoutEffect(() => {
    const acknowledgement = pending.current.includes(committed);
    pending.current = pending.current.filter((request) => request !== committed);
    if (!acknowledgement && timer.current) clearTimeout(timer.current);
  }, [committed]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function setValue(next: string) {
    if (timer.current) clearTimeout(timer.current);
    setState((current) => ({ ...current, draft: next }));
    function commit() {
      if (next !== committed) pending.current.push(next);
      change.current(next || null);
    }
    if (!next) commit();
    else timer.current = setTimeout(commit, delay);
  }
  return { value: state.draft, setValue };
}
