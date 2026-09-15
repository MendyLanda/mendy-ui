import type { SheetLayout, SheetSide } from "./types.js";
export interface SheetEntry {
  id: string;
  side: SheetSide;
  width: number;
  order: number;
  requestedOrder?: number;
  pinOrder: number;
  pinned: boolean;
  pinnable: boolean;
}
export interface StackLayout {
  sheets: ReadonlyMap<string, SheetLayout>;
  startWidth: number;
  endWidth: number;
  hasOverlay: boolean;
}
/** Pure geometry; no DOM reads while opening, pinning, or changing the stack. */
export function layoutSheets(entries: readonly SheetEntry[], viewport: number): StackLayout {
  const width = Math.max(0, viewport);
  const mobile = width < 768;
  const ordered = [...entries].sort((a, b) => a.order - b.order);
  // If the rail would consume the viewport, keep pin intent but show a normal stack.
  const requestedPins = ordered.filter((entry) => entry.pinned);
  const pinTotal = requestedPins.reduce((sum, entry) => sum + entry.width, 0);
  const pinsFit = !mobile && pinTotal <= Math.max(0, width - 320);
  const pins = pinsFit ? requestedPins.sort((a, b) => a.pinOrder - b.pinOrder) : [];
  const pinIds = new Set(pins.map((entry) => entry.id));
  const floating = ordered.filter((entry) => !pinIds.has(entry.id));
  const reserved = pins.reduce((sum, entry) => sum + entry.width, 0);
  const available = Math.max(0, width - reserved);
  const tiled = !mobile && floating.reduce((sum, entry) => sum + entry.width, 0) <= available;
  const top = floating.at(-1)?.id ?? pins.at(-1)?.id;
  const visibleCount = pins.length + (tiled ? floating.length : Math.min(1, floating.length));
  const offsets = { start: 0, end: 0 };
  const sheets = new Map<string, SheetLayout>();
  for (const entry of pins) {
    sheets.set(entry.id, {
      offset: offsets[entry.side],
      width: entry.width,
      pinned: true,
      covered: false,
      top: entry.id === top,
      canPin: true,
      modal: false,
    });
    offsets[entry.side] += entry.width;
  }
  const startWidth = offsets.start;
  const endWidth = offsets.end;
  for (const entry of [...floating].reverse()) {
    sheets.set(entry.id, {
      offset: offsets[entry.side],
      width: mobile ? width : Math.min(entry.width, available),
      pinned: false,
      covered: !tiled && entry.id !== top,
      top: entry.id === top,
      canPin: !mobile && entry.pinnable && reserved + entry.width <= width - 320,
      modal: visibleCount === 1 && entry.id === top,
    });
    if (tiled) offsets[entry.side] += entry.width;
  }
  return { sheets, startWidth, endWidth, hasOverlay: floating.length > 0 };
}
