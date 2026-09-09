"use client";

import type { Choice, OptionPage, RuntimeField } from "./filter-definition.js";
import { useValueDraft } from "./use-value-draft.js";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

interface Request {
  promise: Promise<OptionPage<Choice>>;
  abort: AbortController;
  users: number;
  settled: boolean;
  created: number;
}
export type OptionCache = Map<string, Request>;
export const FilterOptionCache = createContext<OptionCache | null>(null);
function acquire(
  cache: OptionCache,
  key: string,
  load: (signal: AbortSignal) => Promise<OptionPage<Choice>>,
) {
  let request = cache.get(key);
  if (request?.settled && Date.now() - request.created > 30_000) {
    cache.delete(key);
    request = undefined;
  }
  if (!request) {
    const abort = new AbortController();
    request = {
      promise: Promise.resolve().then(() => load(abort.signal)),
      abort,
      users: 0,
      settled: false,
      created: Date.now(),
    };
    const current = request;
    current.promise.then(
      () => {
        current.settled = true;
      },
      () => {
        current.settled = true;
        if (cache.get(key) === current) cache.delete(key);
      },
    );
    cache.set(key, request);
    if (cache.size > 100)
      for (const [oldKey, old] of cache) {
        if (old.settled && old.users === 0) {
          cache.delete(oldKey);
          if (cache.size <= 80) break;
        }
      }
  }
  request.users++;
  const current = request;
  let released = false;
  return {
    promise: current.promise,
    signal: current.abort.signal,
    release() {
      if (released) return;
      released = true;
      current.users--;
      if (!current.settled && current.users === 0) {
        current.abort.abort();
        if (cache.get(key) === current) cache.delete(key);
      }
    },
  };
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Options could not be loaded.";
}
export function selectedIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? [value]
      : [];
}
export function useFilterOptions(
  id: string,
  field: RuntimeField,
  value: unknown,
  enabled: boolean,
) {
  const sharedCache = useContext(FilterOptionCache);
  const privateCache = useRef<OptionCache>(new Map());
  const cache = sharedCache ?? privateCache.current;
  const source = field.source;
  const latest = useRef(source);
  useLayoutEffect(() => {
    latest.current = source;
  }, [source]);
  const scopeKey = JSON.stringify([id, source?.kind, source?.scope, source?.params]);
  const [localQuery, setLocalQuery] = useValueDraft(scopeKey, () => "", `${id}:query`);
  const query = source?.query ?? localQuery;
  const [retryKey, retry] = useState(0);
  const requestKey = JSON.stringify([scopeKey, query, retryKey]);
  const identity = JSON.stringify([id, source?.kind, source?.scope]);
  const ids = selectedIds(value);
  const idsKey = JSON.stringify(ids);
  const [page, setPage] = useState<{
    key: string;
    items: Choice[];
    cursor?: string | null;
    loading: boolean;
    error?: string;
  }>({ key: "", items: [], loading: false });
  const [resolved, setResolved] = useState<{
    key: string;
    choices: readonly Choice[];
    identity: string;
    done: boolean;
    error?: string;
  }>({ key: "", identity: "", choices: [], done: false });
  const resolveKey = JSON.stringify([scopeKey, idsKey, retryKey]);
  const currentRequest = useRef(requestKey);
  useLayoutEffect(() => {
    currentRequest.current = requestKey;
  }, [requestKey]);
  const moreRelease = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (latest.current?.kind !== "remote" || !enabled) return;
    const requestSource = latest.current;
    let alive = true;
    let release: (() => void) | undefined;
    setPage({ key: requestKey, items: [], loading: true });
    const timer = setTimeout(
      () => {
        const request = acquire(cache, `search:${requestKey}`, (signal) =>
          requestSource.search!(query, undefined, signal),
        );
        release = request.release;
        request.promise.then(
          (result) => {
            if (alive)
              setPage({
                key: requestKey,
                items: [...result.items],
                cursor: result.cursor,
                loading: false,
              });
          },
          (error) => {
            if (alive)
              setPage({ key: requestKey, items: [], loading: false, error: errorMessage(error) });
          },
        );
      },
      query ? (latest.current.debounceMs ?? 200) : 0,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
      release?.();
      moreRelease.current?.();
    };
  }, [requestKey, query, enabled, cache]);
  useEffect(() => {
    if (latest.current?.kind !== "remote" || ids.length === 0) return;
    const requestSource = latest.current;
    let alive = true;
    const currentIds = JSON.parse(idsKey) as string[];
    const request = acquire(cache, `resolve:${resolveKey}`, async (signal) => ({
      items: await requestSource.resolve!(currentIds, signal),
    }));
    request.promise.then(
      (result) => {
        if (alive) setResolved({ key: resolveKey, identity, choices: result.items, done: true });
      },
      (error) => {
        if (alive)
          setResolved((previous) => ({
            key: resolveKey,
            identity,
            choices: previous.identity === identity ? previous.choices : [],
            done: true,
            error: errorMessage(error),
          }));
      },
    );
    return () => {
      alive = false;
      request.release();
    };
  }, [resolveKey, idsKey, ids.length, cache, identity]);

  const remote = source?.kind === "remote";
  const currentPage =
    page.key === requestKey
      ? page
      : { items: [], loading: enabled, cursor: null, error: undefined };
  const matchingResolved = resolved.key === resolveKey;
  const items = remote ? currentPage.items : (source?.items ?? []);
  const { selected, shown } = optionPresentation(
    source,
    items,
    ids,
    resolved,
    matchingResolved,
    resolved.identity === identity,
    remote,
    query,
  );
  return {
    query,
    setQuery(next: string) {
      if (source?.onQueryChange) source.onQueryChange(next);
      else setLocalQuery(next);
    },
    items: shown,
    selected,
    loading: remote ? currentPage.loading : (source?.loading ?? false),
    resolving: remote && ids.length > 0 && !matchingResolved,
    error: currentPage.error ?? (matchingResolved ? resolved.error : undefined) ?? source?.error,
    retry() {
      source?.retry?.();
      retry((key) => key + 1);
    },
    hasMore: remote ? Boolean(currentPage.cursor) : (source?.hasMore ?? false),
    loadMore() {
      if (!remote) {
        source?.loadMore?.();
        return;
      }
      if (!currentPage.cursor || currentPage.loading) return;
      const cursor = currentPage.cursor;
      setPage((previous) => ({ ...previous, loading: true, error: undefined }));
      const request = acquire(cache, `search:${requestKey}:${cursor}`, (signal) =>
        source.search!(query, cursor, signal),
      );
      moreRelease.current = request.release;
      request.promise
        .then(
          (result) => {
            if (request.signal.aborted || currentRequest.current !== requestKey) return;
            setPage((previous) => ({
              key: requestKey,
              items: [
                ...new Map(
                  [...previous.items, ...result.items].map((item) => [item.value, item]),
                ).values(),
              ],
              cursor: result.cursor,
              loading: false,
            }));
          },
          (error) => {
            if (!request.signal.aborted && currentRequest.current === requestKey)
              setPage((previous) => ({ ...previous, loading: false, error: errorMessage(error) }));
          },
        )
        .finally(request.release);
    },
  };
}

function optionPresentation(
  source: RuntimeField["source"],
  items: readonly Choice[],
  ids: string[],
  resolved: { choices: readonly Choice[]; done: boolean; error?: string },
  matchingResolved: boolean,
  retainedLabels: boolean,
  remote: boolean,
  query: string,
) {
  const known = new Map<string, Choice>();
  for (const item of [
    ...(source?.selectedItems ?? []),
    ...(retainedLabels ? resolved.choices : []),
    ...items,
  ])
    known.set(item.value, item);
  const selected = ids.map(
    (id) =>
      known.get(id) ?? {
        value: id,
        label:
          remote && matchingResolved && resolved.done && !resolved.error
            ? `Unavailable (${id})`
            : id,
      },
  );
  const shown =
    remote || source?.onQueryChange
      ? items
      : items.filter((item) => item.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return { selected, shown };
}
