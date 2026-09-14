import type { ReactNode } from "react";
import type { TableDataState } from "./table-view.js";
import { Button } from "../primitives/button.js";
export function TableInitialState({
  status,
  hasRows,
  loadingState,
  emptyState,
  error,
  retry,
  hasFilters,
  pageIndex = 0,
  clearFilters,
  firstPage,
}: Pick<TableDataState, "status" | "error" | "retry"> & {
  hasRows: boolean;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  hasFilters?: boolean;
  pageIndex?: number;
  clearFilters?: () => void;
  firstPage?: () => void;
}) {
  if (hasRows) return null;
  if (status === "loading") return loadingState ?? null;
  if (status === "error")
    return (
      <div role="alert" className="p-6 text-center">
        {error ?? "Could not load rows."}
        {retry && (
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        )}
      </div>
    );
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground"
    >
      {emptyState ??
        (pageIndex > 0 ? (
          <>
            <span>No results on this page.</span>
            <Button variant="outline" size="sm" onClick={firstPage}>
              Go to first page
            </Button>
          </>
        ) : hasFilters ? (
          <>
            <span>No results match your filters.</span>
            {clearFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </>
        ) : (
          "No rows yet."
        ))}
    </div>
  );
}
