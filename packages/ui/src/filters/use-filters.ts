"use client";

import type {
  BoundDefinitions,
  FilterDefinitions,
  FilterValues,
  RuntimeField,
} from "./filter-definition.js";
import type { FilterEntry, PasteResult } from "./filter-state.js";
import { useLayoutEffect, useRef, useState } from "react";
import { classifyPaste, initialValues } from "./filter-state.js";

export interface FilterChange {
  source: "edit" | "remove" | "clear" | "paste" | "suggestion" | "search";
}
export interface FilterController<S = unknown> {
  values: S;
  search: string;
  entries: FilterEntry[];
  active: FilterEntry[];
  menuOpen: boolean;
  setMenuOpen(open: boolean): void;
  openField: string | null;
  setOpenField(id: string | null): void;
  editField: string | null;
  edit(id: string | null): void;
  commit(id: string, value: unknown, source?: FilterChange["source"]): string | undefined;
  batch(
    changes: Record<string, unknown>,
    search?: string,
    source?: FilterChange["source"],
  ): string | undefined;
  remove(id: string): void;
  clear(): void;
  setSearch(search: string): void;
  paste(text: string, remainder?: { before: string; after: string }): PasteResult;
  error: string | null;
  shareable: boolean;
  persistenceMessage?: string;
}
interface ControllerOptions<S> {
  entries: FilterEntry[];
  value: S;
  search: string;
  apply(changes: Record<string, unknown>, search: string | undefined, meta: FilterChange): void;
  onChange?: (value: S, meta: FilterChange) => void;
}
export function useFilterController<S>(options: ControllerOptions<S>): FilterController<S> {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openField, setOpenField] = useState<string | null>(null);
  const [editField, edit] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  function batch(
    changes: Record<string, unknown>,
    search?: string,
    source: FilterChange["source"] = "edit",
  ) {
    const normalized: Record<string, unknown> = {};
    const entriesById = new Map(options.entries.map((entry) => [entry.id, entry]));
    for (const [id, value] of Object.entries(changes)) {
      const entry = entriesById.get(id);
      if (!entry || entry.field.disabled) continue;
      try {
        const next = entry.field.normalize(value);
        const message =
          source === "clear" || source === "remove" ? undefined : entry.field.validate(next);
        if (message) {
          setError(message);
          return message;
        }
        normalized[id] = next;
      } catch {
        const message = "This filter value is invalid.";
        setError(message);
        return message;
      }
    }
    setError(null);
    options.apply(normalized, search, { source });
  }
  return {
    values: options.value,
    search: options.search,
    entries: options.entries,
    active: options.entries.filter(
      (entry) => !entry.field.hidden && entry.field.isActive(entry.value),
    ),
    menuOpen,
    setMenuOpen: (open) => {
      setMenuOpen(open);
      if (!open) {
        setOpenField(null);
        setError(null);
      }
    },
    openField,
    setOpenField,
    editField,
    edit: (id) => {
      edit(id);
      if (!id) setError(null);
    },
    batch,
    commit: (id, value, source) => batch({ [id]: value }, undefined, source),
    remove(id) {
      const entry = options.entries.find((item) => item.id === id);
      if (entry?.field.removable !== false) {
        batch({ [id]: entry?.field.clearValue }, undefined, "remove");
        edit(null);
      }
    },
    clear() {
      batch(
        Object.fromEntries(
          options.entries.flatMap((entry) =>
            entry.field.removable !== false && !entry.field.hidden && !entry.field.disabled
              ? [[entry.id, entry.field.clearValue]]
              : [],
          ),
        ),
        "",
        "clear",
      );
      edit(null);
      setMenuOpen(false);
      setOpenField(null);
    },
    setSearch: (search) => {
      batch({}, search, "search");
    },
    paste(text, remainder) {
      const result = classifyPaste(text, options.entries);
      const unmatched = [...result.unmatched, ...result.ambiguous.map((item) => item.token)].join(
        " ",
      );
      const search = remainder
        ? [remainder.before, unmatched, remainder.after].filter(Boolean).join(" ")
        : [options.search, unmatched].filter(Boolean).join(" ");
      let cursor = [remainder ? remainder.before : options.search, result.unmatched.join(" ")]
        .filter(Boolean)
        .join(" ").length;
      for (const item of result.ambiguous) {
        if (cursor) cursor++;
        item.searchRange = { start: cursor, end: cursor + item.token.length };
        cursor += item.token.length;
      }
      batch(result.changes, search, "paste");
      return result;
    },
    error,
    shareable: true,
  };
}
export interface LocalFilterOptions<D extends FilterDefinitions> {
  defaultValues?: Partial<FilterValues<D>>;
  defaultSearch?: string;
  onChange?: (values: FilterValues<D>, meta: FilterChange) => void;
}
export function useFilters<const D extends FilterDefinitions>(
  definitions: D,
  options: LocalFilterOptions<D> = {},
) {
  const [state, setState] = useState(() => ({
    values: { ...initialValues(definitions), ...options.defaultValues } as FilterValues<D>,
    search: options.defaultSearch ?? "",
  }));
  const pending = useRef(state);
  useLayoutEffect(() => {
    pending.current = state;
  }, [state]);
  const controller = useFilterController({
    entries: Object.entries(definitions).map(([id, field]) => ({
      id,
      field,
      value: state.values[id] ?? (state.values[id] === null ? null : field.defaultValue),
    })),
    value: state.values,
    search: state.search,
    apply(changes, search, meta) {
      const next = {
        values: { ...pending.current.values, ...changes },
        search: search ?? pending.current.search,
      };
      pending.current = next;
      setState(next);
      options.onChange?.(next.values, meta);
    },
  });
  return {
    ...controller,
    set<K extends keyof FilterValues<D> & string>(key: K, value: FilterValues<D>[K]) {
      return controller.commit(key, value);
    },
  };
}
export interface ControlledFilterOptions<S> {
  definitions: BoundDefinitions<S>;
  value: S;
  onPatch(patch: Partial<S>, meta: FilterChange): void;
  search?: { read(value: S): string; write(search: string, current: S): Partial<S> };
}
export function useControlledFilters<S>(options: ControlledFilterOptions<S>): FilterController<S> {
  const pending = useRef(options.value);
  useLayoutEffect(() => {
    pending.current = options.value;
  }, [options.value]);
  return useFilterController({
    value: options.value,
    search: options.search?.read(options.value) ?? "",
    entries: Object.entries(options.definitions).map(([id, field]) => ({
      id,
      field: field as RuntimeField,
      value: field.read(options.value),
    })),
    apply(changes, search, meta) {
      let next = pending.current;
      let patch: Partial<S> = {};
      for (const [id, value] of Object.entries(changes)) {
        const update = options.definitions[id]!.write(value, next);
        patch = { ...patch, ...update };
        next = { ...next, ...update };
      }
      if (search !== undefined && options.search)
        patch = { ...patch, ...options.search.write(search, next) };
      pending.current = { ...next, ...patch };
      options.onPatch(patch, meta);
    },
  });
}
