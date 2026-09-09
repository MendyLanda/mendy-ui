import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { originalClassNames } from "./class-names.js";

/** Merge before restoring private classes so application overrides remain ordinary CSS. */
export function cn(...inputs: ClassValue[]) {
  const originals = new Map<string, string>();
  const tokens = clsx(inputs).split(/\s+/).filter(Boolean);
  const merged = twMerge(
    tokens
      .map((token) => {
        const original = originalClassNames[token] ?? token;
        originals.set(original, token);
        return original;
      })
      .join(" "),
  );
  return merged
    .split(" ")
    .map((token) => originals.get(token) ?? token)
    .join(" ");
}
