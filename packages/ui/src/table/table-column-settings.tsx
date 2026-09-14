"use client";
import type { ReactNode } from "react";
import type { Column } from "@tanstack/react-table";
import type { DraggableProvided, DropResult } from "@hello-pangea/dnd";
import type { DataTableInstance } from "./use-data-table.js";
import type { DataTableFeatures } from "./features.js";
import type { TableColumn } from "./columns.js";
import { useId } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Pin, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useMendyUI } from "../customization.js";
import { Button } from "../primitives/button.js";
import { Checkbox } from "../primitives/checkbox.js";
import { Popover, PopoverContent, PopoverTrigger } from "../primitives/popover.js";
import { cn } from "../utils.js";
import { applyTablePreferences } from "./use-data-table.js";

export function TableColumnSettings<T extends object>({
  table,
  children,
}: {
  table: DataTableInstance<T>;
  children?: ReactNode;
}) {
  const id = useId();
  const { portalContainer } = useMendyUI();
  const columns = table.getAllLeafColumns();
  const byId = new Map(columns.map((column) => [column.id, column]));
  const order = [
    ...new Set([...table.state.columnOrder, ...columns.map((column) => column.id)]),
  ].filter((key) => byId.has(key));
  const ordered = order.map((key) => byId.get(key)!);
  const hidden = columns.filter((column) => !column.getIsVisible()).length;
  const start = columns.filter((column) => column.getIsPinned() === "start").length;
  const end = columns.filter((column) => column.getIsPinned() === "end").length;
  const summary = [
    hidden && `${hidden} hidden`,
    start && `${start} pinned left`,
    end && `${end} pinned right`,
  ]
    .filter(Boolean)
    .join(", ");
  function reorder(result: DropResult) {
    if (!result.destination || result.destination.index === result.source.index) return;
    const next = [...order];
    const [moved] = next.splice(result.source.index, 1);
    next.splice(result.destination.index, 0, moved);
    table.setColumnOrder(next);
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Column settings"
          title="Column settings"
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label="Column settings"
        className="flex w-[300px] flex-col p-0"
        onCloseAutoFocus={(event) => {
          if (document.activeElement?.closest('[role="grid"]')) event.preventDefault();
        }}
      >
        <div className="shrink-0 border-b px-4 py-3">
          <h4 className="text-sm font-medium">Column settings</h4>
          <p className="text-xs text-muted-foreground">
            Drag to reorder, toggle visibility, and pin columns.
          </p>
        </div>
        {children}
        <DragDropContext onDragEnd={reorder}>
          <Droppable
            droppableId={id}
            getContainerForClone={() => portalContainer ?? document.body}
            renderClone={(provided, snapshot, rubric) => (
              <ColumnSettingsRow
                column={ordered[rubric.source.index]}
                provided={provided}
                dragging={snapshot.isDragging}
              />
            )}
          >
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="min-h-0 max-h-[400px] overflow-y-auto p-2"
              >
                {ordered.map((column, index) => (
                  <Draggable
                    key={column.id}
                    draggableId={`${id}-${column.id}`}
                    disableInteractiveElementBlocking
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <ColumnSettingsRow
                        column={column}
                        provided={provided}
                        dragging={snapshot.isDragging}
                      />
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {summary || "No changes"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-label="Reset columns"
            onClick={() => applyTablePreferences(table, { version: 1, ...table.initialState })}
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
function ColumnSettingsRow<T extends object>({
  column,
  provided,
  dragging,
}: {
  column: Column<DataTableFeatures, T>;
  provided: DraggableProvided;
  dragging: boolean;
}) {
  const definition = column.columnDef as TableColumn<T>;
  const label =
    definition.label ?? (typeof definition.header === "string" ? definition.header : column.id);
  const pin = column.getIsPinned();
  const next = pin === "start" ? "end" : pin === "end" ? false : "start";
  const pinLabel =
    next === "start"
      ? `Pin ${label} to left`
      : next === "end"
        ? `Pin ${label} to right`
        : `Unpin ${label}`;
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      data-mendy-ui=""
      data-column-setting={column.id}
      data-dragging={dragging}
      style={provided.draggableProps.style}
      className={cn(
        "flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-sm text-foreground",
        dragging ? "z-50 shadow-lg ring-2 ring-primary" : "hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        {...provided.dragHandleProps}
        aria-label={`Reorder ${label}`}
        title="Drag to reorder. Press Space to move with arrow keys."
        className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <Checkbox
          checked={column.getIsVisible()}
          disabled={!column.getCanHide()}
          onCheckedChange={(value) => column.toggleVisibility(value === true)}
          aria-label={`Show ${label}`}
        />
        <span className="truncate" title={label}>
          {label}
        </span>
      </label>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={!column.getCanPin()}
        aria-label={pinLabel}
        title={pinLabel}
        className={cn("size-6 shrink-0", pin && "bg-muted")}
        onClick={() => column.pin(next)}
      >
        <Pin
          className={cn(
            "size-3.5",
            pin === "start" && "-rotate-45",
            pin === "end" && "rotate-45",
            !pin && "text-muted-foreground",
          )}
        />
      </Button>
    </div>
  );
}
