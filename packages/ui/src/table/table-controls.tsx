"use client";
import type { ReactNode } from "react";
import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import type { SavedTableView } from "./state.js";
import { useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "../primitives/button.js";
import { Checkbox } from "../primitives/checkbox.js";
import { Input } from "../primitives/input.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../primitives/dropdown-menu.js";
import { applyTablePreferences } from "./use-data-table.js";

export function TableColumnSettings<T extends object>({ table }: { table: DataTableInstance<T> }) {
  const columns = table.getAllLeafColumns();
  const byId = new Map(columns.map((column) => [column.id, column]));
  const orderedIds = new Set(table.state.columnOrder);
  const order = [
    ...table.state.columnOrder,
    ...columns.map((column) => column.id).filter((id) => !orderedIds.has(id)),
  ];
  function move(id: string, delta: number) {
    const next = [...order],
      index = next.indexOf(id),
      destination = index + delta;
    if (index < 0 || destination < 0 || destination >= next.length) return;
    next.splice(index, 1);
    next.splice(destination, 0, id);
    table.setColumnOrder(next);
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Column settings">
          <SlidersHorizontal className="size-4" />
          <span>Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-96 w-64 overflow-auto"
        aria-label="Column settings"
      >
        {order.map((id, index) => {
          const column = byId.get(id);
          if (!column) return null;
          const definition = column.columnDef as TableColumn<T>;
          const label =
            definition.label ?? (typeof definition.header === "string" ? definition.header : id);
          return (
            <DropdownMenuSub key={id}>
              <DropdownMenuSubTrigger>{label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuCheckboxItem
                  checked={column.getIsVisible()}
                  disabled={!column.getCanHide()}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(value) => column.toggleVisibility(value)}
                >
                  Visible
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!column.getCanPin()}
                  onSelect={(event) => {
                    event.preventDefault();
                    column.pin(column.getIsPinned() === "start" ? false : "start");
                  }}
                >
                  {" "}
                  {column.getIsPinned() === "start" ? "Unpin" : "Pin to start"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!column.getCanPin()}
                  onSelect={(event) => {
                    event.preventDefault();
                    column.pin(column.getIsPinned() === "end" ? false : "end");
                  }}
                >
                  {column.getIsPinned() === "end" ? "Unpin" : "Pin to end"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === 0}
                  onSelect={(event) => {
                    event.preventDefault();
                    move(id, -1);
                  }}
                >
                  Move earlier
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === order.length - 1}
                  onSelect={(event) => {
                    event.preventDefault();
                    move(id, 1);
                  }}
                >
                  Move later
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => applyTablePreferences(table, { version: 1, ...table.initialState })}
        >
          Reset columns
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export function TablePagination<T extends object>({
  table,
  loading,
}: {
  table: DataTableInstance<T>;
  loading?: boolean;
}) {
  return (
    <nav
      data-mendy-ui=""
      aria-label="Table pagination"
      className="flex flex-wrap items-center justify-end gap-3 py-2 text-sm"
    >
      <span>
        Page {table.state.pagination.pageIndex + 1}
        {table.getPageCount() >= 0 ? ` of ${Math.max(1, table.getPageCount())}` : ""}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {table.state.pagination.pageSize} rows
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {[10, 20, 50, 100].map((size) => (
            <DropdownMenuItem key={size} onSelect={() => table.setPageSize(size)}>
              {size} rows
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={loading || !table.getCanPreviousPage()}
        aria-label="Previous page"
        onClick={() => table.previousPage()}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={loading || !table.getCanNextPage()}
        aria-label="Next page"
        onClick={() => table.nextPage()}
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}
export function selectionColumn<T extends object>(): TableColumn<T> {
  return {
    id: "_selection",
    label: "Select rows",
    size: 44,
    minSize: 44,
    maxSize: 44,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    enableCellSelection: false,
    pin: "start",
    exportOptions: false,
    header: ({ table }) => (
      <Checkbox
        data-mendy-ui=""
        aria-label="Select loaded rows"
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        data-mendy-ui=""
        aria-label={`Select row ${row.id}`}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(value === true)}
      />
    ),
  };
}
export function TableActionBar({
  count,
  children,
  onClear,
}: {
  count: number;
  children: ReactNode;
  onClear: () => void;
}) {
  if (!count) return null;
  return (
    <div
      data-mendy-ui=""
      role="region"
      aria-label="Selected row actions"
      className="sticky bottom-2 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-md border bg-background px-3 py-2 shadow-md"
    >
      <span className="text-sm">{count} selected</span>
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}
export function TableSavedViews<F>({
  views,
  onApply,
  onSave,
  onDelete,
}: {
  views: readonly SavedTableView<F>[];
  onApply: (view: SavedTableView<F>) => void;
  onSave: (name: string) => Promise<unknown>;
  onDelete?: (view: SavedTableView<F>) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      setName("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save changes.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div data-mendy-ui="" className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            Saved views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {views.length ? (
            views.map((view) => (
              <DropdownMenuSub key={view.id}>
                <DropdownMenuSubTrigger>{view.name}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => onApply(view)}>Apply</DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem
                      disabled={pending}
                      onSelect={() => void run(() => onDelete(view))}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          ) : (
            <DropdownMenuItem disabled>No saved views</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && !pending) void run(() => onSave(name.trim()));
        }}
      >
        <Input
          aria-label="New view name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 w-40"
        />
        <Button type="submit" size="sm" disabled={pending || !name.trim()}>
          Save view
        </Button>
      </form>
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
