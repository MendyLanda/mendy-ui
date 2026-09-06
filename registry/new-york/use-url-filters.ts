"use client";

import type { FilterDefinitions, FilterValues } from "@/registry/new-york/filter-definition";
import type { FilterChange } from "@/registry/new-york/use-filters";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { parseAsString, useQueryStates } from "nuqs";
import {
  decodeFilters,
  encodeFilters,
  validateDefinitions,
} from "@/registry/new-york/filter-state";
import { useFilterController } from "@/registry/new-york/use-filters";

export interface UrlFilterOptions {
  /** Include the current organization/user when remembering scoped data. */
  scope: string;
  searchKey?: string;
  markerKey?: string;
  remember?: "session" | false;
  maxUrlLength?: number;
  history?: "replace" | "push";
  shallow?: boolean;
  onPersistenceError?: (message: string) => void;
}
interface Overflow {
  marker: string;
  scope: string;
  query: string;
}
interface Snapshot {
  query: string;
  savedAt: number;
}
const subscribeStorage = () => () => {};
function useStoredQuery(key: string | null) {
  return useSyncExternalStore(
    subscribeStorage,
    () => (key ? (readSnapshot(key)?.query ?? null) : null),
    () => null,
  );
}
function readSnapshot(key: string): Snapshot | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" &&
      value !== null &&
      "query" in value &&
      typeof value.query === "string" &&
      "savedAt" in value &&
      typeof value.savedAt === "number"
      ? (value as Snapshot)
      : null;
  } catch {
    return null;
  }
}
/** Uses nuqs as the applied state owner. Only overflow values live outside the URL. */
export function useUrlFilters<const D extends FilterDefinitions>(
  definitions: D,
  options: UrlFilterOptions,
) {
  const searchKey = options.searchKey ?? "q";
  const markerKey = options.markerKey ?? "_filters";
  validateDefinitions(definitions, searchKey, markerKey);
  const keys = [
    ...Object.entries(definitions).map(([id, field]) => field.urlKey ?? id),
    searchKey,
    markerKey,
  ];
  const parsers = Object.fromEntries(keys.map((key) => [key, parseAsString]));
  const [raw, setRaw] = useQueryStates(parsers, {
    history: options.history ?? "replace",
    shallow: options.shallow ?? true,
  });
  const [overflow, setOverflow] = useState<Overflow | null>(null);
  const [message, setMessage] = useState<string>();
  const [ready, setReady] = useState(false);
  const latest = useRef({ definitions, options, raw });
  useLayoutEffect(() => {
    latest.current = { definitions, options, raw };
  }, [definitions, options, raw]);
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const storageKey = `mendy-ui:filters:${path}:${searchKey}:${options.scope}`;
  const marker = raw[markerKey];
  const storedQuery = useStoredQuery(marker ? `${storageKey}:overflow:${marker}` : null);
  const pending = useRef<{ values: Record<string, unknown>; search: string } | null>(null);
  const fullParams = appliedParams(raw, keys, marker, overflow, storedQuery, options.scope);
  const values = decodeFilters(definitions, fullParams) as FilterValues<D>;
  const search = fullParams.get(searchKey) ?? "";
  useLayoutEffect(() => {
    pending.current = { values, search };
  }, [values, search]);

  function report(text: string) {
    setMessage(text);
    options.onPersistenceError?.(text);
  }
  function writeSnapshot(key: string, query: string): boolean {
    try {
      sessionStorage.setItem(
        key,
        JSON.stringify({ query, savedAt: Date.now() } satisfies Snapshot),
      );
      return true;
    } catch {
      report("Filters could not be saved in this browser. Keep this page open to retain them.");
      return false;
    }
  }
  function update(values: Record<string, unknown>, search: string, source: FilterChange["source"]) {
    pending.current = { values, search };
    const full = encodeFilters(definitions, values, new URLSearchParams(window.location.search));
    full.delete(markerKey);
    if (search) full.set(searchKey, search);
    else full.delete(searchKey);
    const owned = new URLSearchParams();
    for (const key of keys) if (full.has(key)) owned.set(key, full.get(key)!);
    const exceeds =
      `${window.location.origin}${window.location.pathname}?${full}`.length >
      (options.maxUrlLength ?? 2000);
    const next: Record<string, string | null> = Object.fromEntries(
      keys.map((key) => [key, full.get(key)]),
    );
    setMessage(undefined);
    if (exceeds) {
      const token = crypto.randomUUID();
      writeSnapshot(`${storageKey}:overflow:${token}`, owned.toString());
      setOverflow({ marker: token, scope: options.scope, query: owned.toString() });
      for (const key of keys) next[key] = null;
      next[markerKey] = token;
      // Bound saved history while retaining recent overflow states for browser navigation.
      try {
        const prefix = `${storageKey}:overflow:`;
        const saved = Object.keys(sessionStorage)
          .flatMap((key) =>
            key.startsWith(prefix) ? [{ key, time: readSnapshot(key)?.savedAt ?? 0 }] : [],
          )
          .sort((a, b) => b.time - a.time);
        for (const item of saved.slice(30)) sessionStorage.removeItem(item.key);
      } catch {
        /* Storage failure was already reported by writeSnapshot. */
      }
    } else setOverflow(null);
    if (options.remember === "session") {
      if (source === "clear") {
        try {
          sessionStorage.removeItem(storageKey);
        } catch {
          report("Remembered filters could not be cleared in this browser.");
        }
      } else writeSnapshot(storageKey, owned.toString());
    }
    void setRaw(next).catch(() =>
      report("The URL could not be updated. Filters may not survive a reload."),
    );
  }

  useEffect(() => {
    setReady(true);
    const current = latest.current;
    const address = new URLSearchParams(window.location.search);
    const hasUrl = [
      ...Object.entries(current.definitions).map(([id, field]) => field.urlKey ?? id),
      searchKey,
      markerKey,
    ].some((key) => address.has(key));
    if (!hasUrl && current.options.remember === "session") {
      const saved = readSnapshot(storageKey);
      if (saved) {
        const params = new URLSearchParams(saved.query);
        const restored = decodeFilters(current.definitions, params);
        update(restored, params.get(searchKey) ?? "", "edit");
      }
    }
    // Restoration runs once per storage scope. URL changes subsequently belong to nuqs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const controller = useFilterController({
    value: values,
    search,
    entries: Object.entries(definitions).map(([id, field]) => ({ id, field, value: values[id] })),
    apply(changes, nextSearch, meta) {
      update(
        { ...pending.current!.values, ...changes },
        nextSearch ?? pending.current!.search,
        meta.source,
      );
    },
  });
  return {
    ...controller,
    ready,
    shareable: !marker,
    persistenceMessage: persistenceNotice(ready, marker, storedQuery, overflow?.marker, message),
    set<K extends keyof FilterValues<D> & string>(key: K, value: FilterValues<D>[K]) {
      return controller.commit(key, value);
    },
    createLink(base: string) {
      if (marker) return null;
      const url = new URL(base, window.location.origin);
      const params = encodeFilters(definitions, values, url.searchParams);
      params.delete(markerKey);
      if (search) params.set(searchKey, search);
      else params.delete(searchKey);
      url.search = params.toString();
      return url.toString();
    },
  };
}

function persistenceNotice(
  ready: boolean,
  marker: string | null | undefined,
  storedQuery: string | null,
  memoryMarker: string | undefined,
  message: string | undefined,
) {
  if (ready && marker && storedQuery === null && memoryMarker !== marker)
    return "This link refers to filters saved in another browser session. The full selection is unavailable.";
  if (message) return message;
  if (marker)
    return "This selection is saved in this browser session. The URL does not contain the full filters.";
}

function appliedParams(
  raw: Record<string, string | null>,
  keys: string[],
  marker: string | null | undefined,
  overflow: Overflow | null,
  stored: string | null,
  scope: string,
) {
  if (overflow && overflow.marker === marker && overflow.scope === scope)
    return new URLSearchParams(overflow.query);
  if (marker && stored !== null) return new URLSearchParams(stored);
  const params = new URLSearchParams();
  for (const key of keys) if (raw[key] != null) params.set(key, raw[key]);
  return params;
}
