"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Range } from "@tanstack/react-virtual";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "../utils.js";

export interface CollectionHandle {
  focus(key: string): void;
  focusFirst(): void;
}
interface RowProps {
  ref(node: HTMLElement | null): void;
  style?: CSSProperties;
  tabIndex: number;
  "data-index": number;
  "data-collection-key": string;
}
interface CollectionItem {
  key: string;
  label: string;
  disabled?: boolean;
}

/** A single keyboard model for both ordinary and measured, virtualized collections. */
export function FilterCollection<T extends CollectionItem>({
  items,
  children,
  renderBefore,
  className,
  role,
  label,
  collectionRef,
  initialKey,
}: {
  items: T[];
  children(item: T, index: number, props: RowProps): ReactNode;
  /** Non-interactive content included in the measured row, outside its focus target. */
  renderBefore?(item: T, index: number): ReactNode;
  className?: string;
  role: "menu" | "group";
  label: string;
  collectionRef?: Ref<CollectionHandle>;
  initialKey?: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const pending = useRef<string | null>(null);
  const ownsFocus = useRef(false);
  const previousIndex = useRef(0);
  const [focused, setFocused] = useState(initialKey ?? items.find((item) => !item.disabled)?.key);
  const typeahead = useRef({ text: "", at: 0 });
  const virtual = items.length > 100;
  const keys = useMemo(() => new Map(items.map((item, index) => [item.key, index])), [items]);
  const focusedIndex = focused === undefined ? undefined : keys.get(focused);
  const rowEstimate = (() => {
    const rem =
      typeof document === "undefined"
        ? 16
        : parseFloat(getComputedStyle(document.documentElement).fontSize);
    return (
      rem *
      (typeof matchMedia !== "undefined" &&
      matchMedia("(pointer: fine) and (min-width: 640px)").matches
        ? 2
        : 2.5)
    );
  })();
  const virtualizer = useVirtualizer({
    count: items.length,
    enabled: virtual,
    getScrollElement: () => scroll.current,
    estimateSize: () => rowEstimate,
    getItemKey: useCallback((index: number) => items[index]!.key, [items]),
    overscan: 5,
    initialOffset: () => (initialKey === undefined ? 0 : (keys.get(initialKey) ?? 0) * rowEstimate),
    rangeExtractor: useCallback(
      (range: Range) => {
        const visible = defaultRangeExtractor(range);
        // Keep DOM focus alive when a wheel or touch scroll moves it outside the viewport.
        return focusedIndex === undefined
          ? visible
          : [...new Set([...visible, focusedIndex])].sort((a, b) => a - b);
      },
      [focusedIndex],
    ),
  });
  function focus(key: string) {
    const index = keys.get(key);
    if (index === undefined || items[index]?.disabled) return;
    pending.current = key;
    setFocused(key);
    if (virtual) virtualizer.scrollToIndex(index, { align: "auto" });
    const node = nodes.current.get(key);
    if (node) {
      node.focus({ preventScroll: virtual });
      pending.current = null;
    }
  }
  useImperativeHandle(collectionRef, () => ({
    focus,
    focusFirst() {
      const first = items.find((item) => !item.disabled);
      if (first) focus(first.key);
    },
  }));
  useLayoutEffect(() => {
    if (pending.current !== null && !keys.has(pending.current)) pending.current = null;
    if (focusedIndex === undefined || items[focusedIndex]?.disabled) {
      const replacement =
        items.slice(previousIndex.current).find((item) => !item.disabled) ??
        items
          .slice(0, previousIndex.current)
          .reverse()
          .find((item) => !item.disabled);
      setFocused(replacement?.key);
      if (!replacement) previousIndex.current = 0;
      const active = document.activeElement;
      if (
        ownsFocus.current &&
        (active === document.body || (active && scroll.current?.contains(active)))
      ) {
        if (replacement) focus(replacement.key);
        else scroll.current?.focus({ preventScroll: true });
      }
    } else {
      previousIndex.current = focusedIndex;
      // Enabling virtualization can briefly have no measured range. Restore a
      // still-valid focused item as soon as its row mounts again.
      if (ownsFocus.current && document.activeElement === document.body)
        focus(items[focusedIndex]!.key);
    }
    const key = pending.current;
    const node = key === null ? undefined : nodes.current.get(key);
    if (!node) return;
    node.focus({ preventScroll: virtual });
    const index = keys.get(key!);
    if (virtual && index !== undefined) virtualizer.scrollToIndex(index, { align: "auto" });
    pending.current = null;
  });
  function render(index: number, start?: number) {
    const item = items[index]!;
    const rowStyle: CSSProperties | undefined = virtual
      ? {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          transform: `translateY(${start}px)`,
        }
      : undefined;
    const row = children(item, index, {
      "data-index": index,
      tabIndex: item.key === focused && !item.disabled ? 0 : -1,
      "data-collection-key": item.key,
      ref(node) {
        if (node) {
          nodes.current.set(item.key, node);
          if (virtual && !renderBefore) virtualizer.measureElement(node);
        } else nodes.current.delete(item.key);
      },
      style: renderBefore ? undefined : rowStyle,
    });
    if (!renderBefore) return row;
    return (
      <div
        key={item.key}
        data-index={index}
        data-slot="filter-collection-row"
        ref={virtual ? virtualizer.measureElement : undefined}
        style={rowStyle}
      >
        {renderBefore(item, index)}
        {row}
      </div>
    );
  }
  return (
    <div
      ref={scroll}
      tabIndex={-1}
      role={role}
      aria-label={label}
      data-filter-collection=""
      data-virtual={virtual}
      className={cn("min-h-0 overflow-y-auto overscroll-contain p-1", className)}
      onBlurCapture={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          ownsFocus.current = false;
      }}
      onFocusCapture={(event) => {
        ownsFocus.current = true;
        const key = (event.target as HTMLElement).closest<HTMLElement>("[data-collection-key]")
          ?.dataset.collectionKey;
        if (key !== undefined && keys.has(key)) setFocused(key);
      }}
      onKeyDownCapture={(event) => {
        if (event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
        if (
          (event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]")
        )
          return;
        const key = (event.target as HTMLElement).closest<HTMLElement>("[data-collection-key]")
          ?.dataset.collectionKey;
        if (key === undefined || !keys.has(key)) return;
        const enabled = items.filter((item) => !item.disabled);
        const index = enabled.findIndex((item) => item.key === key);
        let next: T | undefined;
        const page = Math.max(
          1,
          Math.floor((scroll.current?.clientHeight ?? 320) / rowEstimate) - 1,
        );
        switch (event.key) {
          case "Home":
            next = enabled[0];
            break;
          case "End":
            next = enabled.at(-1);
            break;
          case "ArrowDown":
            next = enabled[(index + 1) % enabled.length];
            break;
          case "ArrowUp":
            next = enabled[(index - 1 + enabled.length) % enabled.length];
            break;
          case "PageDown":
            next = enabled[Math.min(index + page, enabled.length - 1)];
            break;
          case "PageUp":
            next = enabled[Math.max(index - page, 0)];
            break;
          default: {
            if (event.key.length !== 1 || event.key === " ") return;
            const now = Date.now();
            const text =
              now - typeahead.current.at < 600 ? typeahead.current.text + event.key : event.key;
            typeahead.current = { text, at: now };
            const term = [...text].every((char) => char === text[0]) ? text[0]! : text;
            const order = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)];
            next = order.find((item) =>
              item.label.toLocaleLowerCase().startsWith(term.toLocaleLowerCase()),
            );
          }
        }
        event.preventDefault();
        event.stopPropagation();
        if (next) focus(next.key);
      }}
    >
      <div
        role="presentation"
        style={
          virtual
            ? { height: virtualizer.getTotalSize(), position: "relative", width: "100%" }
            : undefined
        }
      >
        {virtual
          ? virtualizer.getVirtualItems().map((row) => render(row.index, row.start))
          : items.map((_, index) => render(index))}
      </div>
    </div>
  );
}
