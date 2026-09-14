"use client";
import type { KeyboardEvent, RefObject } from "react";
import type { CellSelectionDirection } from "@tanstack/react-table";
import type { DataTableInstance } from "./use-data-table.js";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { interactiveSelector, selectedCellsText } from "./clipboard.js";

export function useTableInteraction<T extends object>({
  table,
  pinningActive,
  container,
  queryKey,
  onRowActivate,
  onCopyError,
  scrollToIndex,
}: {
  table: DataTableInstance<T>;
  pinningActive: boolean;
  container: RefObject<HTMLDivElement | null>;
  queryKey?: string;
  onRowActivate?: (row: T) => void;
  onCopyError?: (error: unknown) => void;
  scrollToIndex: (index: number) => void;
}) {
  const rows = table.getRowModel().rows;
  const columns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  const focused = table.getFocusedCell();
  const [announcement, setAnnouncement] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  const ownedFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const remember = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      ownedFocus.current =
        element.contains(target) && target.getAttribute("role") === "gridcell" ? target : null;
    };
    document.addEventListener("focusin", remember);
    return () => document.removeEventListener("focusin", remember);
  }, [container]);
  useLayoutEffect(() => {
    // A virtual row can unmount the focused cell without a blur event. Keep
    // keyboard commands on the grid rather than silently returning them to body.
    if (
      ownedFocus.current &&
      !ownedFocus.current.isConnected &&
      document.activeElement === document.body &&
      table.getSelectedCellCount()
    ) {
      ownedFocus.current = null;
      container.current?.focus({ preventScroll: true });
    }
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(copyTimer.current);
    };
  }, []);
  const resetCellSelection = table.resetCellSelection;
  useEffect(() => {
    resetCellSelection(true);
    if (container.current) container.current.scrollTop = 0;
  }, [queryKey, resetCellSelection, container]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node))
        resetCellSelection(true);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [resetCellSelection, container]);
  async function copySelection() {
    try {
      const text = selectedCellsText(table);
      if (!text) return;
      await navigator.clipboard.writeText(text);
      if (!mounted.current) return;
      setAnnouncement("Selected cells copied");
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 300);
    } catch (reason) {
      if (mounted.current) {
        setAnnouncement("Could not copy selected cells");
        onCopyError?.(reason);
      }
    }
  }
  function focusCell(rowId: string, columnId: string) {
    const index = rows.findIndex((row) => row.id === rowId);
    if (index < 0) return;
    scrollToIndex(index);
    requestAnimationFrame(() => {
      const cell = container.current?.querySelector<HTMLElement>(
        `[data-row-id="${CSS.escape(rowId)}"][data-column-id="${CSS.escape(columnId)}"]`,
      );
      cell?.focus({ preventScroll: true });
      if (cell && (!pinningActive || !table.getColumn(columnId)?.getIsPinned())) {
        const box = cell.getBoundingClientRect(),
          viewport = container.current!.getBoundingClientRect();
        const startWidth = !pinningActive
          ? 0
          : table.getStartVisibleLeafColumns().reduce((sum, col) => sum + col.getSize(), 0);
        const endWidth = !pinningActive
          ? 0
          : table.getEndVisibleLeafColumns().reduce((sum, col) => sum + col.getSize(), 0);
        if (box.left < viewport.left + startWidth)
          container.current!.scrollLeft += box.left - viewport.left - startWidth;
        else if (box.right > viewport.right - endWidth)
          container.current!.scrollLeft += box.right - viewport.right + endWidth;
      }
    });
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest(interactiveSelector)) return;
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "c" &&
      !window.getSelection()?.toString() &&
      table.getSelectedCellCount()
    ) {
      event.preventDefault();
      void copySelection();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      table.selectAllCells();
      return;
    }
    if (event.key === "Escape") {
      table.resetCellSelection(true);
      return;
    }
    const directions: Record<string, CellSelectionDirection> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      if (!table.getFocusedCell() && rows[0] && columns[0])
        table.setFocusedCell(rows[0].id, columns[0].id);
      else if (event.shiftKey) table.extendCellSelection(direction);
      else table.moveCellSelection(direction);
      const range = table.atoms.cellSelection.get().at(-1);
      if (range) focusCell(range.focusRowId, range.focusColumnId);
    } else if (event.key === "Enter" && focused && onRowActivate) {
      event.preventDefault();
      onRowActivate(focused.row.original);
    }
  };
  return { announcement, copied, onKeyDown };
}
