import type { FilterController } from "./use-filters.js";
import { classifyPaste } from "./filter-state.js";

/** Shared operations for an applied controller and the search draft shown by FilterRoot. */
export function filterControllerActions(
  controller: Pick<
    FilterController,
    "entries" | "search" | "batch" | "edit" | "setMenuOpen" | "setOpenField"
  >,
) {
  const { entries, search, batch, edit, setMenuOpen, setOpenField } = controller;
  return {
    commit: (id: string, value: unknown, source?: Parameters<FilterController["commit"]>[2]) =>
      batch({ [id]: value }, undefined, source),
    remove(id: string) {
      const entry = entries.find((item) => item.id === id);
      if (entry?.field.removable !== false) {
        batch({ [id]: entry?.field.clearValue }, undefined, "remove");
        edit(null);
      }
    },
    clear() {
      batch(
        Object.fromEntries(
          entries.flatMap((entry) =>
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
    setSearch: (text: string) => {
      batch({}, text, "search");
    },
    paste(text: string, remainder?: { before: string; after: string }) {
      const result = classifyPaste(text, entries);
      const unmatched = [...result.unmatched, ...result.ambiguous.map((item) => item.token)].join(
        " ",
      );
      const nextSearch = remainder
        ? [remainder.before, unmatched, remainder.after].filter(Boolean).join(" ")
        : [search, unmatched].filter(Boolean).join(" ");
      let cursor = [remainder ? remainder.before : search, result.unmatched.join(" ")]
        .filter(Boolean)
        .join(" ").length;
      for (const item of result.ambiguous) {
        if (cursor) cursor++;
        item.searchRange = { start: cursor, end: cursor + item.token.length };
        cursor += item.token.length;
      }
      batch(result.changes, nextSearch, "paste");
      return result;
    },
  };
}
