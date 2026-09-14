"use client";
import type { ReactNode } from "react";
import type { DataTableInstance } from "./use-data-table.js";
import type { TableColumn } from "./columns.js";
import type { SavedTableView } from "./state.js";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../primitives/button.js";
import { Checkbox } from "../primitives/checkbox.js";
import { Input } from "../primitives/input.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../primitives/dropdown-menu.js";

export { TableColumnSettings } from "./table-column-settings.js";
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
