"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import type { Column, Header } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableHeaderCell, TableBodyRow } from "./table-parts.js";
import { Button } from "../primitives/button.js";
import { cn } from "../utils.js";
import { useViewportWidth } from "./use-viewport-width.js";
import { TableInitialState } from "./table-feedback.js";
import { useTableInteraction } from "./use-table-interaction.js";

export interface TableDataState {
  status?: "loading" | "ready" | "error";
  error?: ReactNode;
  retry?: () => void;
  refreshing?: boolean;
  loadMore?: { available: boolean; loading: boolean; load: () => unknown; error?: ReactNode };
}
export interface TableViewProps<T extends object> extends TableDataState {
  table: DataTableInstance<T>;
  label?: string;
  height?: number | string;
  rowHeight?: number;
  className?: string;
  /** Theme adapter for application-owned renderers, not package controls. */
  contentClassName?: string;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
  /** Change when the result set changes, not when another page is appended. */
  queryKey?: string;
  renderHeader?: (header: Header<DataTableFeatures, T, unknown>) => ReactNode;
  onRowActivate?: (row: T) => void;
  isRowHighlighted?: (row: T) => boolean;
  onCopyError?: (error: unknown) => void;
}
export function TableView<T extends object>({
  table,
  label = "Data table",
  height = "min(65dvh, 640px)",
  rowHeight = 44,
  className,
  contentClassName,
  emptyState,
  loadingState,
  scrollRef,
  status = "ready",
  refreshing,
  error,
  retry,
  loadMore,
  queryKey,
  renderHeader,
  onRowActivate,
  isRowHighlighted,
  onCopyError,
}: TableViewProps<T>) {
  const container = useRef<HTMLDivElement>(null);
  const setContainer = useCallback(
    (node: HTMLDivElement | null) => {
      container.current = node;
      if (typeof scrollRef === "function") scrollRef(node);
      else if (scrollRef) scrollRef.current = node;
    },
    [scrollRef],
  );
  const rows = table.getRowModel().rows;
  const columns = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getCenterVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ];
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => container.current,
    estimateSize: () => rowHeight,
    getItemKey: (index) => rows[index]?.id ?? index,
    overscan: 8,
  });
  const viewportWidth = useViewportWidth(container);
  const totalWidth = columns.reduce((sum, column) => sum + column.getSize(), 0);
  const pinnedWidth = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ].reduce((sum, column) => sum + column.getSize(), 0);
  // Preserve stored pins, but leave room to reach the middle columns on narrow screens.
  const pinningActive = (viewportWidth ?? Infinity) >= Math.min(totalWidth, pinnedWidth + 120);
  const { announcement, copied, onKeyDown } = useTableInteraction({
    table,
    pinningActive,
    container,
    queryKey,
    onRowActivate,
    onCopyError,
    scrollToIndex: (index) => virtual.scrollToIndex(index, { align: "auto" }),
  });
  const items = virtual.getVirtualItems();
  const last = items.at(-1)?.index ?? -1;
  const requested = useRef<string | null>(null);
  const load = useRef(loadMore);
  useLayoutEffect(() => {
    load.current = loadMore;
  }, [loadMore]);
  useEffect(() => {
    const data = load.current;
    const requestKey = `${queryKey}:${rows.length}`;
    if (
      !data?.available ||
      data.loading ||
      data.error ||
      last < rows.length - 10 ||
      requested.current === requestKey
    )
      return;
    requested.current = requestKey;
    Promise.resolve()
      .then(() => data.load())
      .catch(() => {
        requested.current = null;
      });
  }, [last, rows.length, queryKey, loadMore?.available, loadMore?.loading, loadMore?.error]);
  const positions = new Map<string, { side: "left" | "right"; offset: number }>();
  let offset = 0;
  for (const column of table.getStartVisibleLeafColumns()) {
    positions.set(column.id, { side: "left", offset });
    offset += column.getSize();
  }
  offset = 0;
  for (const column of [...table.getEndVisibleLeafColumns()].reverse()) {
    positions.set(column.id, { side: "right", offset });
    offset += column.getSize();
  }
  function cellStyle(column: Column<DataTableFeatures, T>): CSSProperties {
    const pin = pinningActive ? positions.get(column.id) : undefined;
    return {
      width: column.getSize(),
      minWidth: column.getSize(),
      height: rowHeight,
      ...(column.id === table.getEndVisibleLeafColumns()[0]?.id
        ? { marginInlineStart: "auto" }
        : {}),
      ...(pin ? { position: "sticky", [pin.side]: pin.offset, zIndex: 2 } : {}),
    };
  }
  const focused = table.getFocusedCell();
  const headersById = new Map(table.getFlatHeaders().map((header) => [header.column.id, header]));

  return (
    <div data-mendy-ui="" className="min-w-0">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        ref={setContainer}
        role="grid"
        aria-label={label}
        aria-rowcount={rows.length + 1}
        aria-colcount={columns.length}
        aria-busy={status === "loading" || refreshing}
        style={{ height }}
        className={cn(
          "relative isolate overflow-auto rounded-md border bg-background text-sm outline-none",
          className,
        )}
        onKeyDown={onKeyDown}
      >
        <div
          role="row"
          aria-rowindex={1}
          className="sticky top-0 z-20 flex min-w-full border-b bg-background"
          style={{ width: totalWidth }}
        >
          {columns.map((column, index) => (
            <TableHeaderCell
              key={column.id}
              table={table}
              header={headersById.get(column.id)!}
              index={index}
              style={cellStyle(column)}
              renderHeader={renderHeader}
              contentClassName={contentClassName}
            />
          ))}
        </div>
        <TableInitialState
          status={status}
          hasRows={rows.length > 0}
          loadingState={loadingState}
          emptyState={emptyState}
          error={error}
          retry={retry}
        />
        <div
          role="rowgroup"
          className="relative min-w-full"
          style={{ height: virtual.getTotalSize(), width: totalWidth }}
        >
          {items.map((item) => (
            <TableBodyRow
              key={item.key}
              row={rows[item.index]}
              rowIndex={item.index}
              start={item.start}
              rowHeight={rowHeight}
              cellStyle={cellStyle}
              focusedId={focused?.id}
              copied={copied}
              contentClassName={contentClassName}
              onRowActivate={onRowActivate}
              isRowHighlighted={isRowHighlighted}
            />
          ))}
        </div>
        {rows.length > 0 && status === "error" && (
          <div role="alert" className="sticky bottom-0 bg-background p-3">
            {error ?? "Could not refresh rows."}
            {retry && (
              <Button onClick={retry} variant="outline" size="sm">
                Retry
              </Button>
            )}
          </div>
        )}
        {loadMore?.available && (
          <div className="sticky left-0 flex justify-center p-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={loadMore.loading}
              onClick={() => {
                requested.current = null;
                void Promise.resolve()
                  .then(() => loadMore.load())
                  .catch(() => {
                    requested.current = null;
                  });
              }}
            >
              {loadMore.loading
                ? "Loading more…"
                : loadMore.error
                  ? "Retry loading more"
                  : "Load more"}
            </Button>
            {loadMore.error && <span role="alert">{loadMore.error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
