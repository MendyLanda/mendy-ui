"use client";
import type { CSSProperties, RefObject } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

/** Position the menu against the search field and the available viewport. */
export function useMenuPlacement(
  anchor: RefObject<HTMLDivElement | null> | undefined,
  trigger: RefObject<HTMLButtonElement | null>,
  desktop: boolean,
) {
  const [alignOffset, setAlignOffset] = useState(0);
  const [anchorWidth, setAnchorWidth] = useState<number>();
  const [side, setSide] = useState<"top" | "bottom">("bottom");
  useLayoutEffect(() => {
    const button = trigger.current;
    if (!button) return;
    const update = () => {
      const bounds = button.getBoundingClientRect();
      const target = anchor?.current?.getBoundingClientRect();
      setAnchorWidth(target?.width);
      const rtl = getComputedStyle(button).direction === "rtl";
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const below = viewportBottom - bounds.bottom - 23;
      const above = bounds.top - viewportTop - 23;
      const preferredHeight = 30 * parseFloat(getComputedStyle(document.documentElement).fontSize);
      // A short list can fit below the trigger while its editor cannot. Choose room
      // for the editor before Radix constrains its height to the current side.
      setSide(below < preferredHeight && above > below ? "top" : "bottom");
      // Follow the search edge in both layouts, including inset mobile triggers.
      setAlignOffset(
        desktop
          ? rtl
            ? bounds.right - (target?.right ?? bounds.right)
            : (target?.left ?? bounds.left) - bounds.left
          : rtl
            ? (target?.left ?? bounds.left) - bounds.left
            : bounds.right - (target?.right ?? bounds.right),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor?.current ?? button);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, [anchor, desktop, trigger]);

  const anchorStyle = anchorWidth
    ? ({ "--mendy-filter-anchor-width": `${anchorWidth}px` } as CSSProperties)
    : undefined;
  return { alignOffset, side, anchorStyle };
}

/** Follow the selected row while keeping the editor inside the viewport. */
export function useEditorOffset({
  detached,
  editorPanel,
  content,
  rows,
  selectedId,
}: {
  detached: boolean;
  editorPanel: RefObject<HTMLDivElement | null>;
  content: RefObject<HTMLDivElement | null>;
  rows: RefObject<Map<string, HTMLButtonElement>>;
  selectedId?: string;
}) {
  const [editorOffset, setEditorOffset] = useState(0);
  const measured = useRef({ id: selectedId, height: 0 });
  useLayoutEffect(() => {
    if (!detached) return;
    const panel = editorPanel.current;
    const root = content.current;
    if (!panel || !root) return;
    const update = () => {
      const row = rows.current.get(selectedId ?? "");
      if (!row) {
        setEditorOffset(0);
        return;
      }
      const rootTop = root.getBoundingClientRect().top;
      const list = root.querySelector('[data-slot="filter-menu-list"]');
      const listBottom = list?.getBoundingClientRect().bottom ?? rootTop;
      const currentHeight = panel.getBoundingClientRect().height;
      if (measured.current.id !== selectedId) measured.current = { id: selectedId, height: 0 };
      // Result filtering may shrink the editor. Keep its input in place instead
      // of moving it down under the pointer on every query change.
      measured.current.height = Math.max(measured.current.height, currentHeight);
      const height = measured.current.height;
      const viewport = window.visualViewport;
      const viewportBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      // Keep short editors inside the list's vertical span. Lower rows therefore
      // open upward even on a tall viewport, instead of dangling below the list.
      const latestTop = Math.max(rootTop, Math.min(listBottom, viewportBottom - 16) - height);
      const preferredTop = row.getBoundingClientRect().top - 5;
      setEditorOffset(Math.max(0, Math.min(preferredTop, latestTop) - rootTop));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    observer.observe(root);
    const list = root.querySelector('[data-slot="filter-menu-list"]');
    if (list) observer.observe(list);
    root.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      root.removeEventListener("scroll", update, true);
    };
  }, [detached, selectedId, editorPanel, content, rows]);

  return editorOffset;
}

/** Only the visible panels receive pointer events; the positioner's empty area does not. */
export function useAnchoredPointerEvents(
  content: RefObject<HTMLDivElement | null>,
  detached: boolean,
) {
  const restore = useRef<(() => void) | undefined>(undefined);
  return useCallback(
    (node: HTMLDivElement | null) => {
      restore.current?.();
      restore.current = undefined;
      content.current = node;
      if (!detached) return;
      const positioner = node?.parentElement;
      if (!positioner?.hasAttribute("data-radix-popper-content-wrapper")) return;
      const previous = positioner.style.pointerEvents;
      positioner.style.pointerEvents = "none";
      restore.current = () => {
        positioner.style.pointerEvents = previous;
      };
    },
    [content, detached],
  );
}
