import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { originalClassNames } from "./class-names.js";

// Cache complete merges, including the private-class translation. Bound the cache
// because application-supplied class names may contain arbitrary values.
const mergedClasses = new Map<string, string>();

/** Merge before restoring private classes so application overrides remain ordinary CSS. */
export function cn(...inputs: ClassValue[]) {
  const input = clsx(inputs);
  const cached = mergedClasses.get(input);
  if (cached !== undefined) return cached;
  const originals = new Map<string, string>();
  const tokens = input.split(/\s+/).filter(Boolean);
  const merged = twMerge(
    tokens
      .map((token) => {
        const original = originalClassNames[token] ?? token;
        originals.set(original, token);
        return original;
      })
      .join(" "),
  );
  const result = merged
    .split(" ")
    .map((token) => originals.get(token) ?? token)
    .join(" ");
  if (mergedClasses.size >= 512) mergedClasses.delete(mergedClasses.keys().next().value!);
  mergedClasses.set(input, result);
  return result;
}
