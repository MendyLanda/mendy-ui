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
}: Pick<TableDataState, "status" | "error" | "retry"> & {
  hasRows: boolean;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
}) {
  if (hasRows) return null;
  if (status === "loading")
    return (
      loadingState ?? (
        <div role="status" aria-label="Loading rows" className="space-y-3 p-3">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-8 animate-pulse rounded bg-muted motion-reduce:animate-none"
            />
          ))}
        </div>
      )
    );
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
    <div role="status" className="p-8 text-center text-muted-foreground">
      {emptyState ?? "No results."}
    </div>
  );
}
