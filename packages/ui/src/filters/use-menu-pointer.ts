"use client";

import type { PointerEvent, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";

type Point = { x: number; y: number };

/** Allow a short diagonal path from a filter row into its adjacent editor. */
export function useMenuPointer({
  editor,
  selectedId,
  onChoose,
}: {
  editor: RefObject<HTMLDivElement | null>;
  selectedId?: string;
  onChoose(id: string): void;
}) {
  const origin = useRef<Point | null>(null);
  const last = useRef<Point | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const candidate = useRef<string | null>(null);
  const choose = useRef(onChoose);
  useLayoutEffect(() => {
    choose.current = onChoose;
  });

  function cancel() {
    if (pending.current !== null) clearTimeout(pending.current);
    pending.current = null;
    candidate.current = null;
  }
  useEffect(() => cancel, []);
  useEffect(() => {
    cancel();
    origin.current = null;
  }, [selectedId]);

  function move(id: string, event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== "mouse") return;
    const point = { x: event.clientX, y: event.clientY };
    const previous = last.current;
    last.current = point;
    // Layout changes beneath a stationary cursor are not navigation intent.
    if (previous?.x === point.x && previous.y === point.y) return;
    if (id === selectedId) {
      cancel();
      origin.current = point;
      return;
    }
    const start = origin.current;
    const bounds = editor.current?.getBoundingClientRect();
    if (start && previous && bounds) {
      const edge = start.x < bounds.left ? bounds.left : bounds.right;
      const distance = edge - start.x;
      const progress = (point.x - start.x) / distance;
      const towardsEditor = (point.x - previous.x) * distance > 0;
      const top = start.y + (bounds.top - 8 - start.y) * progress;
      const bottom = start.y + (bounds.bottom + 8 - start.y) * progress;
      if (towardsEditor && progress >= 0 && progress <= 1 && point.y >= top && point.y <= bottom) {
        candidate.current = id;
        if (pending.current === null) {
          pending.current = setTimeout(() => {
            const next = candidate.current;
            cancel();
            if (next) choose.current(next);
          }, 300);
        }
        return;
      }
    }
    cancel();
    choose.current(id);
  }
  return { move, cancel };
}
