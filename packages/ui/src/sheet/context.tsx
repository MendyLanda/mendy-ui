"use client";
import { createContext, useContext } from "react";
import type { RefObject } from "react";
import type { SheetStore } from "./store.js";
import type { SheetCloseReason, SheetLayout, SheetSide } from "./types.js";

export const SheetStackContext = createContext<{
  store: SheetStore;
  container: HTMLElement | null;
  animation: boolean;
  pageRef: RefObject<HTMLDivElement | null>;
} | null>(null);
export interface SheetGuardMessages {
  title?: string;
  description?: string;
  confirm?: string;
  cancel?: string;
}
export const SheetInstanceContext = createContext<{
  id: string;
  open: boolean;
  pinned: boolean;
  pinnable: boolean;
  side: SheetSide;
  width: number;
  descriptionId?: string;
  registerDescription: (id: string) => () => void;
  layout?: SheetLayout;
  contentRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  requestClose: (reason?: SheetCloseReason) => void;
  setOpen: (open: boolean) => void;
  setPinned: (pinned: boolean) => void;
  registerGuard: (read: () => { dirty: boolean; messages?: SheetGuardMessages }) => () => void;
} | null>(null);
export function useSheetInstance() {
  const value = useContext(SheetInstanceContext);
  if (!value) throw new Error("Sheet components must be inside a Sheet.");
  return value;
}

export const SheetControlsContext = createContext<{
  open: boolean;
  pinned: boolean;
  docked: boolean;
  close: (reason?: SheetCloseReason) => void;
  pin: () => void;
  unpin: () => void;
  registerGuard: (read: () => { dirty: boolean; messages?: SheetGuardMessages }) => () => void;
} | null>(null);
