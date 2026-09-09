import type { FilterDefinitions, RuntimeField } from "./filter-definition.js";
import { equalValues } from "./filter-definition.js";

export interface FilterEntry {
  id: string;
  field: RuntimeField;
  value: unknown;
}
export interface PasteCandidate {
  id: string;
  label: string;
  value: unknown;
}
export interface PasteAmbiguity {
  token: string;
  searchRange?: { start: number; end: number };
  candidates: PasteCandidate[];
}
export interface PasteResult {
  changes: Record<string, unknown>;
  unmatched: string[];
  ambiguous: PasteAmbiguity[];
}
export function classifyPaste(text: string, entries: readonly FilterEntry[]): PasteResult {
  const result: PasteResult = { changes: {}, unmatched: [], ambiguous: [] };
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  for (const token of new Set(
    text
      .split(/[\r\n\t,]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  )) {
    const matches: (PasteCandidate & { priority: number })[] = [];
    for (const { id, field } of entries) {
      if (!field.recognize || field.disabled || field.hidden) continue;
      try {
        const recognized = field.recognize(token);
        if (recognized === undefined) continue;
        const value = field.normalize(recognized);
        if (field.validate(value) || !field.isActive(value)) continue;
        matches.push({ id, label: field.label, value, priority: field.pastePriority });
      } catch {
        /* A rejected token stays in search; recognition is not validation of a request. */
      }
    }
    const priority = Math.max(...matches.map((match) => match.priority));
    const best = matches.filter((match) => match.priority === priority);
    if (best.length === 0) result.unmatched.push(token);
    else if (best.length > 1) result.ambiguous.push({ token, candidates: best });
    else {
      const match = best[0]!;
      const entry = entriesById.get(match.id)!;
      result.changes[match.id] = entry.field.merge(
        result.changes[match.id] ?? entry.value,
        match.value,
      );
    }
  }
  return result;
}
export function initialValues(definitions: FilterDefinitions): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(definitions).map(([key, field]) => [key, field.defaultValue]),
  );
}
export function decodeFilters(
  definitions: FilterDefinitions,
  params: URLSearchParams,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(definitions).map(([key, field]) => {
      const raw = params.get(field.urlKey ?? key);
      if (raw === null) return [key, field.defaultValue];
      // Explicit null is distinct from an absent key when a field has an applied default.
      if (raw === "~null") return [key, null];
      try {
        const decoded = field.codec.parse(raw.startsWith("~~") ? raw.slice(1) : raw);
        if (decoded === null || field.validate(decoded)) return [key, field.defaultValue];
        return [key, decoded];
      } catch {
        return [key, field.defaultValue];
      }
    }),
  );
}
export function encodeFilters(
  definitions: FilterDefinitions,
  values: Record<string, unknown>,
  base = new URLSearchParams(),
): URLSearchParams {
  const params = new URLSearchParams(base);
  for (const [key, field] of Object.entries(definitions)) {
    const value = values[key] === undefined ? field.defaultValue : values[key];
    const urlKey = field.urlKey ?? key;
    if (equalValues(value, field.defaultValue)) params.delete(urlKey);
    else {
      const raw = value === null ? "~null" : field.codec.serialize(value);
      params.set(urlKey, value !== null && raw.startsWith("~") ? `~${raw}` : raw);
    }
  }
  return params;
}
export function validateDefinitions(
  definitions: FilterDefinitions,
  searchKey: string,
  markerKey: string,
): void {
  const keys = new Set([searchKey, markerKey]);
  if (searchKey === markerKey) throw new Error("Search and overflow keys must differ.");
  for (const [id, field] of Object.entries(definitions)) {
    const key = field.urlKey ?? id;
    if (keys.has(key)) throw new Error(`Duplicate filter URL key: ${key}`);
    keys.add(key);
  }
}

/** Remove only the occurrence inserted by this paste, retaining pre-existing search text. */
export function resolvePasteAmbiguity(search: string, item: PasteAmbiguity, all: PasteAmbiguity[]) {
  const range = item.searchRange;
  const remaining = all.filter((other) => other !== item);
  if (!range || search.slice(range.start, range.end) !== item.token) return { search, remaining };
  const start = range.start > 0 && search[range.start - 1] === " " ? range.start - 1 : range.start;
  const end = start === 0 && search[range.end] === " " ? range.end + 1 : range.end;
  return {
    search: search.slice(0, start) + search.slice(end),
    remaining: remaining.map((other) =>
      other.searchRange && other.searchRange.start >= end
        ? {
            ...other,
            searchRange: {
              start: other.searchRange.start - (end - start),
              end: other.searchRange.end - (end - start),
            },
          }
        : other,
    ),
  };
}
