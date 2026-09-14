"use client";
import { useLayoutEffect, useMemo, useRef } from "react";

/** Reuse equal array shells; never deep-compare records or ignore changed callbacks. */
export function useStableArray<T>(input: T[]): T[] {
  const committed = useRef(input);
  const value = useMemo(() => {
    const previous = committed.current;
    return input.length === previous.length &&
      input.every((item, index) => item === previous[index])
      ? previous
      : input;
  }, [input]);
  useLayoutEffect(() => {
    committed.current = value;
  }, [value]);
  return value;
}
