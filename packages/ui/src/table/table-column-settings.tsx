"use client";
import { useMendyLocale } from "../locale-context.js";
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
  const { t, direction } = useMendyLocale();
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
    hidden && t("hiddenColumns", { count: hidden }),
    start && t(direction === "rtl" ? "pinnedRight" : "pinnedLeft", { count: start }),
    end && t(direction === "rtl" ? "pinnedLeft" : "pinnedRight", { count: end }),
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
          aria-label={t("columnSettings")}
          title={t("columnSettings")}
        >
          <SlidersHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("columnSettings")}
        className="flex w-[300px] flex-col p-0"
        onCloseAutoFocus={(event) => {
          if (document.activeElement?.closest('[role="grid"]')) event.preventDefault();
        }}
      >
        <div className="shrink-0 border-b px-4 py-3">
          <h4 className="text-sm font-medium">{t("columnSettings")}</h4>
          <p className="text-xs text-muted-foreground">{t("columnSettingsHint")}</p>
        </div>
        {children}
        <DragDropContext
          dragHandleUsageInstructions={t("dragInstructions")}
          onDragStart={(start, { announce }) =>
            announce(t("dragStart", { index: start.source.index + 1 }))
          }
          onDragUpdate={(update, { announce }) =>
            announce(t("dragMove", { index: (update.destination ?? update.source).index + 1 }))
          }
          onDragEnd={(result, { announce }) => {
            reorder(result);
            announce(
              result.reason === "CANCEL" || !result.destination
                ? t("dragCancel")
                : t("dragEnd", { index: result.destination.index + 1 }),
            );
          }}
        >
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
            {summary || t("noChanges")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-label={t("resetColumns")}
            onClick={() => applyTablePreferences(table, { version: 1, ...table.initialState })}
          >
            <RotateCcw className="size-3" />
            {t("reset")}
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
  const { t, direction, code } = useMendyLocale();
  const label =
    (column.id === "_selection" && definition.label === "Select rows"
      ? t("selectRows")
      : definition.label) ??
    (typeof definition.header === "string" ? definition.header : column.id);
  const pin = column.getIsPinned();
  const { next, message } = pinAction(pin, direction);
  const pinLabel = t(message, { label });
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      data-mendy-ui=""
      data-column-setting={column.id}
      dir={direction}
      lang={code}
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
        aria-label={t("reorder", { label })}
        title={t("dragHint")}
        className="flex size-5 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="size-3.5" />
      </button>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <Checkbox
          checked={column.getIsVisible()}
          disabled={!column.getCanHide()}
          onCheckedChange={(value) => column.toggleVisibility(value === true)}
          aria-label={t("showColumn", { label })}
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

function pinAction(pin: false | "start" | "end", direction: "ltr" | "rtl") {
  if (pin === "end") return { next: false, message: "unpin" } as const;
  if (pin === "start")
    return { next: "end", message: direction === "rtl" ? "pinLeft" : "pinRight" } as const;
  return { next: "start", message: direction === "rtl" ? "pinRight" : "pinLeft" } as const;
}
