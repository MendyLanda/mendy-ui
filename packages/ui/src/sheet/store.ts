import type { SheetEntry, StackLayout } from "./layout.js";
import type { OpenSheetOptions, SheetCloseReason, SheetLayout, SheetRecord } from "./types.js";
import { layoutSheets } from "./layout.js";

type Handlers = {
  close: (reason: SheetCloseReason) => void;
  reopen: () => void;
  pin: (pinned: boolean) => void;
  focus: () => void;
};
export interface ManagedSheetOptions extends OpenSheetOptions {
  initialPinned: boolean;
}
const EMPTY_MANAGED: readonly ManagedSheetOptions[] = [];
export function createSheetStore() {
  const entries = new Map<string, SheetEntry>();
  const handlers = new Map<string, Handlers>();
  const listeners = new Set<() => void>();
  let managed = EMPTY_MANAGED;
  let viewport = 0;
  let order = 0;
  let layout = layoutSheets([], viewport);
  function emit() {
    for (const listener of listeners) listener();
  }
  function recalculate() {
    const next = layoutSheets([...entries.values()], viewport);
    // Keep individual snapshots referentially stable for useSyncExternalStore.
    const stable = new Map<string, SheetLayout>();
    for (const [id, value] of next.sheets) {
      const previous = layout.sheets.get(id);
      stable.set(
        id,
        previous &&
          Object.keys(value).every(
            (key) => value[key as keyof SheetLayout] === previous[key as keyof SheetLayout],
          )
          ? previous
          : value,
      );
    }
    if (
      layout.startWidth === next.startWidth &&
      layout.endWidth === next.endWidth &&
      layout.hasOverlay === next.hasOverlay &&
      layout.sheets.size === stable.size &&
      [...stable].every(([id, value]) => layout.sheets.get(id) === value)
    )
      return;
    layout = { ...next, sheets: stable };
    emit();
  }
  const api = {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getLayout: (): StackLayout => layout,
    getSheet: (id: string) => layout.sheets.get(id),
    getManaged: () => managed,
    setViewport(width: number) {
      if (width === viewport) return;
      viewport = width;
      recalculate();
    },
    register(id: string, callbacks: Handlers) {
      handlers.set(id, callbacks);
      return () => {
        if (handlers.get(id) === callbacks) {
          handlers.delete(id);
          entries.delete(id);
          recalculate();
        }
      };
    },
    update(id: string, config: Omit<SheetEntry, "id" | "order" | "pinOrder">) {
      const previous = entries.get(id);
      if (
        previous &&
        Object.keys(config).every(
          (key) => previous[key as keyof typeof config] === config[key as keyof typeof config],
        )
      )
        return;
      const nextOrder = config.requestedOrder ?? previous?.order ?? ++order;
      entries.set(id, {
        ...config,
        id,
        order: nextOrder,
        pinOrder: config.pinned ? (previous?.pinned ? previous.pinOrder : ++order) : 0,
      });
      order = Math.max(order, nextOrder);
      recalculate();
    },
    remove(id: string) {
      if (entries.delete(id)) recalculate();
    },
    close(id: string, reason: SheetCloseReason = "programmatic") {
      handlers.get(id)?.close(reason);
    },
    closeTop(reason: SheetCloseReason = "programmatic") {
      const top = [...layout.sheets].find(([, value]) => value.top);
      if (top) handlers.get(top[0])?.close(reason);
    },
    pin(id: string) {
      if (layout.sheets.get(id)?.canPin) handlers.get(id)?.pin(true);
    },
    unpin(id: string) {
      handlers.get(id)?.pin(false);
    },
    pinTop() {
      const top = [...layout.sheets].find(
        ([, value]) => value.top && value.canPin && !value.pinned,
      );
      if (!top) return false;
      api.pin(top[0]);
      return true;
    },
    focusTop() {
      const top = [...layout.sheets].find(([, value]) => value.top);
      if (top) handlers.get(top[0])?.focus();
      return Boolean(top);
    },
    restore(options: OpenSheetOptions) {
      if (managed.some((entry) => entry.id === options.id)) return;
      managed = [...managed, { ...options, initialPinned: true }];
      emit();
    },
    open(options: OpenSheetOptions) {
      if (entries.has(options.id)) {
        const existing = entries.get(options.id)!;
        entries.set(options.id, { ...existing, order: ++order });
        recalculate();
        handlers.get(options.id)?.focus();
        return;
      }
      if (managed.some((entry) => entry.id === options.id)) {
        handlers.get(options.id)?.reopen();
        return;
      }
      managed = [...managed, { ...options, initialPinned: false }];
      emit();
    },
    removeManaged(id: string) {
      if (entries.has(id)) return;
      if (!managed.some((entry) => entry.id === id)) return;
      managed = managed.filter((entry) => entry.id !== id);
      emit();
    },
    records(): SheetRecord[] {
      return managed
        .flatMap((entry) => {
          const state = entries.get(entry.id);
          if (!entry.persist || !state?.pinned) return [];
          return [
            {
              pinOrder: state.pinOrder,
              record: { id: entry.id, ...entry.persist, side: state.side, width: state.width },
            },
          ];
        })
        .sort((a, b) => a.pinOrder - b.pinOrder)
        .map(({ record }) => record);
    },
  };
  return api;
}
export type SheetStore = ReturnType<typeof createSheetStore>;
