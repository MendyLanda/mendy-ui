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
    <div role="status" className="p-8 text-center text-muted-foreground">
      {emptyState ?? "No results."}
    </div>
  );
}
