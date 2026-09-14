"use client";

import { useCallback, useRef } from "react";

/** Size the containing frame, not the grid, so controls share its available height. */
export function useFillLayout(enabled: boolean) {
  const dispose = useRef<(() => void) | undefined>(undefined);
  return useCallback(
    (node: HTMLDivElement | null) => {
      dispose.current?.();
      dispose.current = undefined;
      if (!node || !enabled) return;

      let frame = 0;
      let previous = -1;
      const measure = () => {
        frame = 0;
        let inset = 0;
        let ancestor = node.parentElement;
        while (ancestor) {
          const style = getComputedStyle(ancestor);
          inset += parseFloat(style.paddingBottom) || 0;
          inset += parseFloat(style.borderBottomWidth) || 0;
          ancestor = ancestor.parentElement;
        }
        const height = Math.max(0, window.innerHeight - node.getBoundingClientRect().top - inset);
        if (Math.abs(height - previous) < 0.5) return;
        previous = height;
        node.style.height = `${height}px`;
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(measure);
      };
      const observer = new ResizeObserver(schedule);
      const observe = () => {
        observer.disconnect();
        let current: Element | null = node;
        while (current?.parentElement) {
          observer.observe(current.parentElement);
          let sibling = current.previousElementSibling;
          while (sibling) {
            observer.observe(sibling);
            sibling = sibling.previousElementSibling;
          }
          current = current.parentElement;
        }
        schedule();
      };
      // Newly inserted preceding siblings can move a table inside a fixed-height parent.
      const mutations = new MutationObserver(observe);
      let parent = node.parentElement;
      while (parent) {
        mutations.observe(parent, { childList: true });
        parent = parent.parentElement;
      }
      measure();
      observe();
      window.addEventListener("resize", schedule);
      dispose.current = () => {
        observer.disconnect();
        mutations.disconnect();
        window.removeEventListener("resize", schedule);
        cancelAnimationFrame(frame);
        if (node.style.height === `${previous}px`) node.style.removeProperty("height");
      };
    },
    [enabled],
  );
}
