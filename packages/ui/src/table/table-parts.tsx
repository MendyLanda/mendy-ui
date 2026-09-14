"use client";
import type { CSSProperties, ReactNode, MouseEvent, TouchEvent } from "react";
import type { Column, Header, Row } from "@tanstack/react-table";
import type { DataTableFeatures } from "./features.js";
import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import { flexRender } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "../primitives/button.js";
import { cn } from "../utils.js";
import { interactiveSelector } from "./clipboard.js";
export function TableHeaderCell<T extends object>({
  table,
  header,
  index,
  style,
  renderHeader,
  contentClassName,
}: {
  table: DataTableInstance<T>;
  header: Header<DataTableFeatures, T, unknown>;
  index: number;
  style: CSSProperties;
  renderHeader?: (header: Header<DataTableFeatures, T, unknown>) => ReactNode;
  contentClassName?: string;
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
      aria-colindex={index + 1}
      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
      style={style}
      className="relative flex shrink-0 items-center gap-1 border-e bg-background px-3 font-medium text-muted-foreground"
    >
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
export function TableBodyRow<T extends object>({
  row,
  rowIndex,
  start,
  rowHeight,
  cellStyle,
  focusedId,
  copied,
  contentClassName,
  onRowActivate,
  isRowHighlighted,
}: {
  row: Row<DataTableFeatures, T>;
  rowIndex: number;
  start: number;
  rowHeight: number;
  cellStyle: (column: Column<DataTableFeatures, T>) => CSSProperties;
  focusedId?: string;
  copied: boolean;
  contentClassName?: string;
  onRowActivate?: (row: T) => void;
  isRowHighlighted?: (row: T) => boolean;
}) {
  const cells = [
    ...row.getStartVisibleCells(),
    ...row.getCenterVisibleCells(),
    ...row.getEndVisibleCells(),
  ];
  return (
    <div
      key={row.id}
      role="row"
      aria-rowindex={rowIndex + 2}
      aria-selected={row.getIsSelected()}
      data-highlighted={isRowHighlighted?.(row.original)}
      data-index={rowIndex}
      className="group absolute left-0 top-0 flex min-w-full hover:bg-accent/50 data-[highlighted=true]:bg-accent"
      style={{ height: rowHeight, transform: `translateY(${start}px)` }}
    >
      {cells.map((cell, index) => {
        const selected = cell.getIsSelected();
        const definition = cell.column.columnDef as TableColumn<T>;
        const edge = selected ? cell.getSelectionEdges() : null;
        return (
          <div
            key={cell.id}
            role="gridcell"
            aria-colindex={index + 1}
            aria-selected={selected}
            data-row-id={row.id}
            data-column-id={cell.column.id}
            tabIndex={
              focusedId ? (focusedId === cell.id ? 0 : -1) : rowIndex === 0 && index === 0 ? 0 : -1
            }
            style={cellStyle(cell.column)}
            className={cn(
              "relative flex shrink-0 items-center border-b border-e bg-background px-3 group-hover:bg-accent group-data-[highlighted=true]:bg-accent focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-primary",
              definition.align === "end" && "justify-end text-end",
              definition.align === "center" && "justify-center text-center",
              selected && "bg-accent",
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
            <div className={cn("max-h-full min-w-0 max-w-full truncate", contentClassName)}>
              {flexRender(
                cell.column.columnDef.cell ?? (() => String(cell.getValue() ?? "")),
                cell.getContext(),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
