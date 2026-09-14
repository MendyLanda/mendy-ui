"use client";

import type { ReactNode, Ref } from "react";
import type { Header } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";
import type { FilterController } from "../filters/use-filters.js";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TableHeaderCell, TableBodyRow } from "./table-parts.js";
import { Button } from "../primitives/button.js";
import { cn } from "../utils.js";
import { useColumnWindow } from "./use-column-window.js";
import { useViewportWidth } from "./use-viewport-width.js";
import { tableLayout } from "./table-layout.js";
import { TableLoadingRows } from "./table-loading.js";
import { TableInitialState } from "./table-feedback.js";
import { useTableInteraction } from "./use-table-interaction.js";
import { useTableResults } from "./use-table-results.js";

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
  /** Defaults to "auto": fit the rows, capped at 65% of the viewport height. */
  height?: number | string;
  /** Auto measures multiline rows and retains all columns to keep their height stable. */
  rowHeight?: number | "auto";
  rowClassName?: (row: T) => string | undefined;
  /** Expanded content beneath a record. Return null for collapsed records. */
  renderRowDetail?: (row: T) => ReactNode;
  className?: string;
  /** Theme adapter for application-owned renderers, not package controls. */
  contentClassName?: string;
  emptyState?: ReactNode;
  loadingState?: ReactNode;
  scrollRef?: Ref<HTMLDivElement>;
  /** Change when the result set changes, not when another page is appended. */
  queryKey?: string;
  /** Shared filter state for query resets and empty-result recovery. */
  filters?: FilterController;
  renderHeader?: (header: Header<DataTableFeatures, T, unknown>) => ReactNode;
  /** Single-click action, also used by Enter unless onRowActivate is provided. */
  onRowClick?: (row: T) => void;
  /** Optional double-click and Enter action. Interactive controls keep their own behavior. */
  onRowActivate?: (row: T) => void;
  isRowHighlighted?: (row: T) => boolean;
  onCopyError?: (error: unknown) => void;
}
export function TableView<T extends object>({
  table,
  label = "Data table",
  height = "auto",
  rowHeight: rowHeightOption = 44,
  rowClassName,
  renderRowDetail,
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
  filters,
  renderHeader,
  onRowClick,
  onRowActivate,
  isRowHighlighted,
  onCopyError,
}: TableViewProps<T>) {
  const { resultKey, hasFilters, clearFilters } = useTableResults(table, queryKey, filters);
  const autoRowHeight = rowHeightOption === "auto" || Boolean(renderRowDetail);
  const rowHeight = rowHeightOption === "auto" ? 44 : rowHeightOption;
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
  const getScrollElement = useCallback(() => container.current, []);
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  const getItemKey = useCallback((index: number) => rows[index]?.id ?? index, [rows]);
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement,
    estimateSize,
    getItemKey,
    overscan: 8,
  });
  const viewportWidth = useViewportWidth(container);
  const startColumns = table.getStartVisibleLeafColumns();
  const centerColumns = table.getCenterVisibleLeafColumns();
  const endColumns = table.getEndVisibleLeafColumns();
  const sizing = table.state.columnSizing;
  const layout = useMemo(
    () => tableLayout(table, viewportWidth, rowHeight),
    [table, startColumns, centerColumns, endColumns, sizing, viewportWidth, rowHeight],
  );
  const { totalWidth, pinningActive } = layout;
  const focused = table.getFocusedCell();
  const { columns, columnGaps, cellStyle } = useColumnWindow(
    layout,
    container,
    viewportWidth,
    focused?.column.id,
    !autoRowHeight,
  );
  const columnIndexes = useMemo(
    () => new Map(layout.columns.map((column, index) => [column.id, index])),
    [layout.columns],
  );
  const { announcement, copied, onKeyDown } = useTableInteraction({
    table,
    pinningActive,
    container,
    queryKey: resultKey,
    onRowActivate: onRowActivate ?? onRowClick,
    onCopyError,
    scrollToIndex: (index) => virtual.scrollToIndex(index, { align: "auto" }),
  });
  const items = virtual.getVirtualItems();
  const last = items.at(-1)?.index ?? -1;
  const requested = useRef<{ key: unknown; count: number } | null>(null);
  const load = useRef(loadMore);
  useLayoutEffect(() => {
    load.current = loadMore;
  }, [loadMore]);
  useEffect(() => {
    requested.current = null;
  }, [resultKey]);
  useEffect(() => {
    const data = load.current;
    if (
      !data?.available ||
      data.loading ||
      data.error ||
      last < rows.length - 10 ||
      (requested.current?.key === resultKey && requested.current.count === rows.length)
    )
      return;
    const element = container.current;
    // Only measure near the end when another page can actually be requested.
    // Reading clientHeight on every scroll otherwise forces layout needlessly.
    const nearEnd =
      element &&
      element.scrollTop + element.clientHeight + rowHeight * 10 >=
        virtual.getTotalSize() + rowHeight;
    if (!nearEnd) return;
    requested.current = { key: resultKey, count: rows.length };
    Promise.resolve()
      .then(() => data.load())
      .catch(() => {
        requested.current = null;
      });
  }, [
    last,
    rows.length,
    rowHeight,
    resultKey,
    loadMore?.available,
    loadMore?.loading,
    loadMore?.error,
    virtual,
  ]);
  const headersById = new Map(table.getFlatHeaders().map((header) => [header.column.id, header]));

  return (
    <div data-mendy-ui="" className="min-w-0">
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <div
        ref={setContainer}
        role="grid"
        tabIndex={-1}
        aria-label={label}
        aria-rowcount={renderRowDetail ? -1 : rows.length + 1}
        aria-colcount={layout.columns.length}
        aria-busy={status === "loading" || refreshing}
        style={{
          height: height === "auto" ? undefined : height,
          maxHeight: height === "auto" ? "65dvh" : undefined,
        }}
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
          {columns.map((column) => (
            <Fragment key={column.id}>
              {columnGaps.has(column.id) && (
                <div
                  aria-hidden="true"
                  className="shrink-0"
                  style={{ width: columnGaps.get(column.id) }}
                />
              )}
              <TableHeaderCell
                key={column.id}
                table={table}
                header={headersById.get(column.id)!}
                index={columnIndexes.get(column.id)!}
                style={cellStyle(column)}
                renderHeader={renderHeader}
                contentClassName={contentClassName}
              />
            </Fragment>
          ))}
        </div>
        <TableInitialState
          status={status}
          hasRows={rows.length > 0}
          loadingState={
            loadingState ?? (
              <TableLoadingRows
                columns={columns}
                columnGaps={columnGaps}
                width={totalWidth}
                rowHeight={rowHeight}
                cellStyle={cellStyle}
                count={
                  height === "auto"
                    ? 8
                    : Math.max(
                        1,
                        Math.ceil(((virtual.scrollRect?.height ?? 400) - rowHeight) / rowHeight),
                      )
                }
              />
            )
          }
          emptyState={emptyState}
          hasFilters={hasFilters}
          pageIndex={table.state.pagination.pageIndex}
          clearFilters={clearFilters}
          firstPage={() => table.setPageIndex(0)}
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
              autoRowHeight={autoRowHeight}
              measureElement={autoRowHeight ? virtual.measureElement : undefined}
              rowClassName={rowClassName}
              renderRowDetail={renderRowDetail}
              detailWidth={viewportWidth ?? totalWidth}
              cellStyle={cellStyle}
              columns={columns}
              columnGaps={columnGaps}
              columnIndexes={columnIndexes}
              contentVersion={table.options}
              contentState={table.state}
              focusedId={focused?.id}
              copied={copied}
              contentClassName={contentClassName}
              onRowClick={onRowClick}
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
          <div className="sticky left-0 flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
            {loadMore.loading ? (
              <div role="status" className="flex items-center gap-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 shrink-0 animate-spin motion-reduce:animate-none"
                >
                  <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
                </svg>
                <span>Loading more…</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  requested.current = null;
                  void Promise.resolve()
                    .then(() => loadMore.load())
                    .catch(() => {
                      requested.current = null;
                    });
                }}
              >
                {loadMore.error ? "Retry loading more" : "Load more"}
              </Button>
            )}
            {loadMore.error && <span role="alert">{loadMore.error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
