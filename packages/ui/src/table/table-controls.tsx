"use client";
import { rowSelectionLabel } from "./row-selection-label.js";
import { useMendyLocale } from "../locale-context.js";
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
  const { t, direction, code, configured } = useMendyLocale();
  return (
    <nav
      data-mendy-ui=""
      dir={configured ? direction : undefined}
      lang={code}
      aria-label={t("pagination")}
      className="flex flex-wrap items-center justify-end gap-3 py-2 text-sm"
    >
      <span>
        {table.getPageCount() >= 0
          ? t("pageOf", {
              page: table.state.pagination.pageIndex + 1,
              count: Math.max(1, table.getPageCount()),
            })
          : t("page", { page: table.state.pagination.pageIndex + 1 })}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {t("rowsPerPage", { count: table.state.pagination.pageSize })}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {[10, 20, 50, 100].map((size) => (
            <DropdownMenuItem key={size} onSelect={() => table.setPageSize(size)}>
              {t("rowsPerPage", { count: size })}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={loading || !table.getCanPreviousPage()}
        aria-label={t("previousPage")}
        onClick={() => table.previousPage()}
      >
        <ChevronLeft className="size-4 rtl:rotate-180" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={loading || !table.getCanNextPage()}
        aria-label={t("nextPage")}
        onClick={() => table.nextPage()}
      >
        <ChevronRight className="size-4 rtl:rotate-180" />
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
      <SelectionCheckbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value === true)}
      />
    ),
    cell: ({ row }) => (
      <SelectionCheckbox
        rowLabel={rowSelectionLabel(row)}
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
  const { t, direction, code, configured } = useMendyLocale();
  if (!count) return null;
  return (
    <div
      data-mendy-ui=""
      dir={configured ? direction : undefined}
      lang={code}
      role="region"
      aria-label={t("selectedActions")}
      className="sticky bottom-2 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center gap-3 rounded-md border bg-background px-3 py-2 shadow-md"
    >
      <span className="text-sm">{t("selectedCount", { count })}</span>
      {children}
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t("clearSelection")}
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
  const { t, direction, code, configured } = useMendyLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await action();
      setName("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("saveError"));
    } finally {
      setPending(false);
    }
  }
  return (
    <div
      data-mendy-ui=""
      dir={configured ? direction : undefined}
      lang={code}
      className="flex flex-wrap items-center gap-2"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
            {t("savedViews")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {views.length ? (
            views.map((view) => (
              <DropdownMenuSub key={view.id}>
                <DropdownMenuSubTrigger>{view.name}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onSelect={() => onApply(view)}>{t("apply")}</DropdownMenuItem>
                  {onDelete && (
                    <DropdownMenuItem
                      disabled={pending}
                      onSelect={() => void run(() => onDelete(view))}
                    >
                      {t("delete")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ))
          ) : (
            <DropdownMenuItem disabled>{t("noSavedViews")}</DropdownMenuItem>
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
          aria-label={t("newViewName")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 w-40"
        />
        <Button type="submit" size="sm" disabled={pending || !name.trim()}>
          {t("saveView")}
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

function SelectionCheckbox({
  rowLabel,
  ...props
}: React.ComponentProps<typeof Checkbox> & { rowLabel?: string | number }) {
  const { t } = useMendyLocale();
  return (
    <Checkbox
      {...props}
      aria-label={rowLabel === undefined ? t("selectLoaded") : t("selectRow", { id: rowLabel })}
    />
  );
}
