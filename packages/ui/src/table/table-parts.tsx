"use client";
import type { CSSProperties, ReactNode, MouseEvent, TouchEvent } from "react";
import type { Cell, Column, Header, Row } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import { Fragment, memo, useMemo } from "react";
import { constructCell, flexRender } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../primitives/button.js";
import { Checkbox } from "../primitives/checkbox.js";
import { cn } from "../utils.js";
import { interactiveSelector } from "./clipboard.js";
export function TableHeaderCell<T extends object>({
  table,
  header,
  index,
  style,
  renderHeader,
  contentClassName,
  selectLoaded,
}: {
  table: DataTableInstance<T>;
  header: Header<DataTableFeatures, T, unknown>;
  index: number;
  style: CSSProperties;
  renderHeader?: (header: Header<DataTableFeatures, T, unknown>) => ReactNode;
  contentClassName?: string;
  selectLoaded?: { checked: boolean | "indeterminate"; disabled: boolean };
}) {
  const column = header.column;
  const definition = column.columnDef as TableColumn<T>;
  const title =
    definition.label ?? (typeof definition.header === "string" ? definition.header : column.id);
  const sorted = column.getIsSorted();
  return (
    <div
      key={column.id}
      role="columnheader"
      data-column-id={column.id}
      aria-colindex={index + 1}
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
      style={style}
      className="group relative flex shrink-0 items-center gap-1 border-e bg-background px-3 font-medium text-muted-foreground"
    >
      {selectLoaded && index === 0 && (
        <Checkbox
          aria-label="Select loaded rows"
          disabled={selectLoaded.disabled}
          checked={selectLoaded.checked}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
          className="me-1 opacity-0 group-hover:opacity-50 hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0! group-hover:disabled:opacity-50! data-[state=checked]:opacity-100 data-[state=indeterminate]:opacity-100 [@media(hover:none)]:opacity-100 [@media(hover:none)]:disabled:opacity-100!"
        />
      )}
      <div
        className={cn(
          "min-w-0 flex-1 overflow-hidden",
          (renderHeader || typeof definition.header === "function") && contentClassName,
        )}
      >
        <TableHeaderContent header={header} renderHeader={renderHeader} title={title} />
      </div>
      {column.getCanResize() && (
        <TableResizeHandle
          table={table}
          header={header}
          title={title}
          width={Number(style.width)}
        />
      )}
    </div>
  );
}
function TableBodyRowImpl<T extends object>({
  row,
  rowIndex,
  start,
  rowHeight,
  autoRowHeight,
  measureElement,
  rowClassName,
  renderRowDetail,
  detailWidth,
  cellStyle,
  columns,
  columnGaps,
  columnIndexes,
  contentVersion,
  contentState,
  focusedId,
  copied,
  contentClassName,
  onRowClick,
  onRowActivate,
  isRowHighlighted,
  inlineSelection,
}: {
  row: Row<DataTableFeatures, T>;
  rowIndex: number;
  start: number;
  rowHeight: number;
  autoRowHeight: boolean;
  measureElement?: (element: HTMLDivElement | null) => void;
  rowClassName?: (row: T) => string | undefined;
  renderRowDetail?: (row: T) => ReactNode;
  detailWidth: number;
  cellStyle: (column: Column<DataTableFeatures, T>) => CSSProperties;
  columns: Column<DataTableFeatures, T>[];
  columnGaps: Map<string, number>;
  columnIndexes: Map<string, number>;
  contentVersion: unknown;
  contentState: unknown;
  focusedId?: string;
  copied: boolean;
  contentClassName?: string;
  onRowClick?: (row: T) => void;
  onRowActivate?: (row: T) => void;
  isRowHighlighted?: (row: T) => boolean;
  inlineSelection: boolean;
}) {
  // The engine's getAllCells API eagerly allocates every column. Build only the
  // viewport cells with its public constructor, and release them with this row.
  const cache = useMemo(
    () => new WeakMap<Column<DataTableFeatures, T>, Cell<DataTableFeatures, T, unknown>>(),
    [row],
  );
  const cells = columns.map((column) => {
    let cell = cache.get(column);
    if (!cell) {
      cell = constructCell(column, row, row.table);
      cache.set(column, cell);
    }
    return cell;
  });
  const rowElement = (
    <div
      key={row.id}
      ref={renderRowDetail ? undefined : measureElement}
      role="row"
      aria-rowindex={renderRowDetail ? undefined : rowIndex + 2}
      aria-selected={row.getIsSelected()}
      data-highlighted={row.getIsSelected() || isRowHighlighted?.(row.original)}
      data-index={rowIndex}
      className={cn(
        "group left-0 flex min-w-full bg-background hover:bg-accent data-[highlighted=true]:bg-accent",
        rowClassName?.(row.original),
      )}
      style={{
        height: autoRowHeight ? undefined : rowHeight,
        minHeight: rowHeight,
        top: renderRowDetail ? 0 : start,
        position: renderRowDetail ? "relative" : "absolute",
      }}
    >
      {cells.map((cell) => {
        const index = columnIndexes.get(cell.column.id)!;
        const selected = cell.getIsSelected();
        const definition = cell.column.columnDef as TableColumn<T>;
        const edge = selected ? cell.getSelectionEdges() : null;
        return (
          <Fragment key={cell.id}>
            {columnGaps.has(cell.column.id) && (
              <div
                aria-hidden="true"
                className="shrink-0"
                style={{ width: columnGaps.get(cell.column.id) }}
              />
            )}
            <div
              key={cell.id}
              role="gridcell"
              aria-colindex={index + 1}
              aria-selected={selected}
              data-row-id={row.id}
              data-column-id={cell.column.id}
              tabIndex={
                focusedId
                  ? focusedId === cell.id
                    ? 0
                    : -1
                  : rowIndex === 0 && index === 0
                    ? 0
                    : -1
              }
              style={
                autoRowHeight
                  ? { ...cellStyle(cell.column), height: undefined, minHeight: rowHeight }
                  : cellStyle(cell.column)
              }
              className={cn(
                "relative flex shrink-0 items-center border-b border-e bg-inherit px-3",
                !(selected && copied) &&
                  "group-hover:bg-accent group-data-[highlighted=true]:bg-accent",
                !selected &&
                  "focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-primary",
                definition.align === "end" && "justify-end text-end",
                definition.align === "center" && "justify-center text-center",
                selected && "bg-accent outline-none",
                selected && copied && "bg-green-100 dark:bg-green-950",
              )}
              onMouseDown={(event) => {
                if (
                  event.button !== 0 ||
                  event.detail > 1 ||
                  !cell.getCanSelect() ||
                  (event.target as Element).closest(interactiveSelector) ||
                  window.getSelection()?.toString()
                )
                  return;
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.focus({ preventScroll: true });
                cell.getSelectionStartHandler()(event);
              }}
              onMouseEnter={cell.getSelectionExtendHandler()}
              onClick={(event) => {
                if (event.detail <= 1 && !(event.target as Element).closest(interactiveSelector))
                  onRowClick?.(row.original);
              }}
              onDoubleClick={(event) => {
                if (!(event.target as Element).closest(interactiveSelector))
                  onRowActivate?.(row.original);
              }}
            >
              {selected && (
                <span
                  aria-hidden="true"
                  data-selection-outline=""
                  className="pointer-events-none absolute z-1 border-primary"
                  style={{
                    top: edge?.top ? 0 : -1,
                    bottom: edge?.bottom ? -1 : -2,
                    left: -Number(cellStyle(cell.column).borderLeftWidth ?? 0),
                    right: -Number(cellStyle(cell.column).borderRightWidth ?? 1),
                    borderTopWidth: edge?.top ? 2 : 0,
                    borderBottomWidth: edge?.bottom ? 2 : 0,
                    borderLeftWidth: edge?.left ? 2 : 0,
                    borderRightWidth: edge?.right ? 2 : 0,
                  }}
                />
              )}
              {inlineSelection && index === 0 && (
                <Checkbox
                  aria-label={`Select row ${rowIndex + 1}`}
                  checked={row.getIsSelected()}
                  disabled={!row.getCanSelect()}
                  onCheckedChange={(value) => row.toggleSelected(value === true)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  className="me-2 opacity-0 group-hover:opacity-50 hover:opacity-100 focus-visible:opacity-100 disabled:opacity-0! group-hover:disabled:opacity-50! data-[state=checked]:opacity-100 data-[state=checked]:disabled:opacity-100! data-[state=indeterminate]:opacity-100 data-[state=indeterminate]:disabled:opacity-100! [@media(hover:none)]:opacity-100 [@media(hover:none)]:disabled:opacity-100!"
                />
              )}
              <div
                className={cn(
                  "min-w-0 max-w-full",
                  autoRowHeight ? "whitespace-normal break-words py-2" : "max-h-full truncate",
                  contentClassName,
                )}
              >
                <TableCellContent
                  cell={cell}
                  renderer={cell.column.columnDef.cell}
                  version={contentVersion}
                  state={contentState}
                />
              </div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
  if (!renderRowDetail) return rowElement;
  const detail = renderRowDetail(row.original);
  return (
    <div
      ref={measureElement}
      data-index={rowIndex}
      role="rowgroup"
      className="absolute left-0 min-w-full"
      style={{ top: start }}
    >
      {rowElement}
      {detail != null && (
        <div role="row" className="border-b bg-background">
          <div
            role="gridcell"
            aria-colspan={columns.length}
            className="sticky min-w-0 p-3"
            style={{ width: detailWidth, maxWidth: "100%", insetInlineStart: 0 }}
          >
            {detail}
          </div>
        </div>
      )}
    </div>
  );
}

export const TableBodyRow = memo(TableBodyRowImpl) as typeof TableBodyRowImpl;

function TableResizeHandle<T extends object>({
  table,
  header,
  title,
  width,
}: {
  table: DataTableInstance<T>;
  header: Header<DataTableFeatures, T, unknown>;
  title: string;
  width: number;
}) {
  const column = header.column;
  const beginResize = (event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if ("touches" in event && event.touches.length > 1) return;
    if ("button" in event) {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.focus({ preventScroll: true });
    }
    // Start dragging from the visible width, not the smaller configured base width.
    header.getResizeHandler()(event);
    table.setColumnSizing((sizes) => ({ ...sizes, [column.id]: width }));
    table.setColumnResizing((state) => ({
      ...state,
      startSize: width,
      columnSizingStart: [[column.id, width]],
    }));
  };
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={`Resize ${title}`}
      aria-orientation="vertical"
      aria-valuenow={Math.round(width)}
      aria-valuemin={column.columnDef.minSize ?? 48}
      aria-valuemax={column.columnDef.maxSize ?? 1200}
      onDoubleClick={() => column.resetSize()}
      onMouseDown={beginResize}
      onTouchStart={beginResize}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          table.setColumnSizing((sizes) => ({
            ...sizes,
            [column.id]: Math.min(
              column.columnDef.maxSize ?? 1200,
              Math.max(
                column.columnDef.minSize ?? 48,
                width + (event.key === "ArrowLeft" ? -10 : 10),
              ),
            ),
          }));
        }
      }}
      className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none select-none hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
    />
  );
}

function TableHeaderContent<T extends object>({
  header,
  renderHeader,
  title,
}: {
  header: Header<DataTableFeatures, T, unknown>;
  renderHeader?: (header: Header<DataTableFeatures, T, unknown>) => ReactNode;
  title: string;
}) {
  const column = header.column;
  const definition = column.columnDef as TableColumn<T>;
  const sorted = column.getIsSorted();
  return renderHeader ? (
    renderHeader(header)
  ) : typeof definition.header === "function" ? (
    flexRender(definition.header, header.getContext())
  ) : !column.getCanSort() ? (
    <span className="block truncate" title={title}>
      {title}
    </span>
  ) : (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 max-w-full justify-start gap-1 px-0 font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={column.getToggleSortingHandler()}
      title={title}
    >
      <span className="truncate">{title}</span>
      {sorted === "asc" ? (
        <ArrowUp className="size-3 shrink-0" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3 shrink-0" />
      ) : null}
    </Button>
  );
}

// Geometry-only updates do not need to rerun application-owned cell renderers.
const TableCellContent = memo(function TableCellContent<T extends object>({
  cell,
  renderer,
}: {
  cell: Cell<DataTableFeatures, T, unknown>;
  renderer: TableColumn<T>["cell"];
  version: unknown;
  state: unknown;
}) {
  return renderer ? flexRender(renderer, cell.getContext()) : String(cell.getValue() ?? "");
}) as <T extends object>(props: {
  cell: Cell<DataTableFeatures, T, unknown>;
  renderer: TableColumn<T>["cell"];
  version: unknown;
  state: unknown;
}) => ReactNode;
