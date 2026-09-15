import { createMultiParser } from "nuqs";
import type { RuntimeField } from "./filter-definition.js";
import { decodeUrlValue } from "./url-value.js";

/** Accept old JSON URLs even when an adapter presents their array as repeated keys. */
export function filterUrlParser(field: RuntimeField) {
  return createMultiParser<string>({
    parse(values) {
      if (!values.length) return null;
      const first = values[0]!;
      if (values.length === 1) {
        if (first === "~null" || first.startsWith("~~") || decodeUrlValue(first) !== first)
          return first;
        if (accepts(first)) return first;
      }
      const strings = JSON.stringify(values);
      if (accepts(strings, true)) return strings;
      const typed = JSON.stringify(
        values.map((value) => {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }),
      );
      return accepts(typed, true) ? typed : null;
    },
    serialize: (value) => [value],
  });
  function accepts(raw: string, arrayOnly = false) {
    try {
      const value = field.codec.parse(raw);
      return value !== null && (!arrayOnly || Array.isArray(value)) && !field.validate(value);
    } catch {
      return false;
    }
  }
}
