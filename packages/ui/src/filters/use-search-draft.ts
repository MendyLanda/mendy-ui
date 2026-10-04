"use client";

import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";

const identity = (value: string) => value;

/** Keep keystrokes local while an applied query or URL update is in flight. */
export function useSearchDraft({
  value,
  onApply,
  context = "",
  delay = 300,
  normalize = identity,
}: {
  value: string;
  onApply: (search: string) => void;
  context?: string;
  delay?: number;
  normalize?: (search: string) => string;
}) {
  const key = (search: string, scope: string) => JSON.stringify([normalize(search), scope]);
  const appliedKey = key(value, context);
  const [state, setState] = useState(() => ({
    appliedKey,
    draft: value,
    pending: [] as {
      key: string;
      search: string;
      acknowledgeContext?: (context: string) => boolean;
    }[],
    reset: 0,
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (state.appliedKey !== appliedKey) {
    const acknowledged = state.pending.findIndex(
      (request) =>
        request.key === appliedKey ||
        (request.search === normalize(value) && request.acknowledgeContext?.(context)),
    );
    setState({
      appliedKey,
      draft: acknowledged < 0 ? value : state.draft,
      pending: acknowledged < 0 ? [] : state.pending.slice(acknowledged + 1),
      reset: state.reset + (acknowledged < 0 ? 1 : 0),
    });
  }
  function cancel() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  function apply(
    text: string,
    action: (search: string) => void = onApply,
    nextContext = context,
    acknowledgeContext?: (context: string) => boolean,
  ) {
    const search = normalize(text);
    action(search);
    cancel();
    const nextKey = key(search, nextContext);
    setState((current) => ({
      ...current,
      draft: text,
      pending:
        nextKey === current.appliedKey && current.pending.length === 0
          ? current.pending
          : [
              ...current.pending.filter((request) => request.key !== nextKey),
              { key: nextKey, search, acknowledgeContext },
            ],
    }));
  }
  const applyLatest = useRef(apply);
  useLayoutEffect(() => {
    applyLatest.current = apply;
  });
  useLayoutEffect(() => cancel(), [state.reset]);
  useEffect(() => cancel, []);

  function setValue(text: string) {
    cancel();
    setState((current) => ({ ...current, draft: text }));
    const search = normalize(text);
    if (
      (search === normalize(value) && state.pending.length === 0) ||
      state.pending.at(-1)?.search === search
    )
      return;
    if (!text || delay <= 0) apply(text);
    else {
      timer.current = setTimeout(() => {
        timer.current = null;
        startTransition(() => {
          applyLatest.current(text);
        });
      }, delay);
    }
  }
  return { value: state.draft, setValue, apply, flush: () => apply(state.draft) };
}
