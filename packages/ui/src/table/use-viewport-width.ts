"use client";
import type { RefObject } from "react";
import { useLayoutEffect, useState } from "react";

/** Vertical virtualization does not notify React when only the viewport width changes. */
export function useViewportWidth(container: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [container]);
  return width;
}
