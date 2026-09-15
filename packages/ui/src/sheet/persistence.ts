import type { SheetRecord, SheetSide } from "./types.js";
interface StoredSheetRecord extends SheetRecord {
  side?: SheetSide;
  width?: number;
}
/** Treat storage as untrusted input. Resolvers still validate their own payloads. */
export function readSheetRecords(value: string | null): StoredSheetRecord[] {
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("sheets" in parsed) ||
    !Array.isArray(parsed.sheets)
  )
    return [];
  const seen = new Set<string>();
  return parsed.sheets
    .filter((item): item is StoredSheetRecord => {
      if (
        !item ||
        typeof item !== "object" ||
        typeof item.id !== "string" ||
        !item.id ||
        typeof item.type !== "string" ||
        !item.type ||
        seen.has(item.id)
      )
        return false;
      if (item.side !== undefined && item.side !== "start" && item.side !== "end") return false;
      if (
        item.width !== undefined &&
        (typeof item.width !== "number" || !Number.isFinite(item.width) || item.width < 240)
      )
        return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 20);
}
