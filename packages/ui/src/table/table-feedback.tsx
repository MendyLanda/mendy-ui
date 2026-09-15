import { useMendyLocale } from "../locale-context.js";
import type { CSSProperties, ReactNode } from "react";
import type { TableDataState } from "./table-view.js";
import { Button } from "../primitives/button.js";

export function TableFeedbackRow({
  children,
  columnCount,
  rowIndex,
  className,
  style,
}: {
  children: ReactNode;
  columnCount: number;
  rowIndex: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div role="row" aria-rowindex={rowIndex} className={className} style={style}>
      <div role="gridcell" aria-colindex={1} aria-colspan={Math.max(1, columnCount)}>
        {children}
      </div>
    </div>
  );
}

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
  columnCount,
  width,
  viewportWidth,
}: Pick<TableDataState, "status" | "error" | "retry"> & {
  hasRows: boolean;
  width: number;
  viewportWidth: number | null;
  columnCount: number;
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  hasFilters?: boolean;
  pageIndex?: number;
  clearFilters?: () => void;
  firstPage?: () => void;
}) {
  const { t } = useMendyLocale();
  if (hasRows) return null;
  if (status === "loading")
    return (
      <TableFeedbackRow columnCount={columnCount} rowIndex={2}>
        {loadingState}
      </TableFeedbackRow>
    );
  if (status === "error")
    return (
      <TableCenteredFeedback columnCount={columnCount} width={width} viewportWidth={viewportWidth}>
        <div role="alert" className="p-6 text-center">
          {error ?? t("loadRowsError")}
          {retry && (
            <Button variant="outline" size="sm" onClick={retry}>
              {t("retry")}
            </Button>
          )}
        </div>
      </TableCenteredFeedback>
    );
  return (
    <TableCenteredFeedback columnCount={columnCount} width={width} viewportWidth={viewportWidth}>
      <div
        role="status"
        className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground"
      >
        {emptyState ??
          (pageIndex > 0 ? (
            <>
              <span>{t("noPageResults")}</span>
              <Button variant="outline" size="sm" onClick={firstPage}>
                {t("firstPage")}
              </Button>
            </>
          ) : hasFilters ? (
            <>
              <span>{t("noFilterResults")}</span>
              {clearFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  {t("clearFilters")}
                </Button>
              )}
            </>
          ) : (
            t("noRows")
          ))}
      </div>
    </TableCenteredFeedback>
  );
}

function TableCenteredFeedback({
  children,
  columnCount,
  width,
  viewportWidth,
}: {
  children: ReactNode;
  columnCount: number;
  width: number;
  viewportWidth: number | null;
}) {
  return (
    // A full-width containing block gives sticky feedback room to follow the
    // viewport in RTL Safari as well as Chromium and Firefox.
    <div role="rowgroup" className="flex flex-1 flex-col" style={{ width }}>
      <TableFeedbackRow
        columnCount={columnCount}
        rowIndex={2}
        style={{ width: viewportWidth ?? "100%" }}
        className="sticky start-0 flex flex-1 items-center justify-center"
      >
        {children}
      </TableFeedbackRow>
    </div>
  );
}

export function TableLoadMore({
  loadMore,
  columnCount,
  rowIndex,
  onLoad,
}: {
  loadMore: NonNullable<TableDataState["loadMore"]>;
  columnCount: number;
  rowIndex: number;
  onLoad: () => void;
}) {
  const { t } = useMendyLocale();
  return (
    <TableFeedbackRow columnCount={columnCount} rowIndex={rowIndex} className="sticky start-0">
      <div className="flex items-center justify-center gap-2 py-5 text-sm text-muted-foreground">
        {loadMore.loading ? (
          <div role="status" className="flex items-center gap-2">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5 shrink-0 animate-spin motion-reduce:animate-none"
            >
              <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
            </svg>
            <span>{t("loadingMore")}</span>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={onLoad}>
            {loadMore.error ? t("retryMore") : t("loadMore")}
          </Button>
        )}
        {loadMore.error && <span role="alert">{loadMore.error}</span>}
      </div>
    </TableFeedbackRow>
  );
}

export function TableRefreshError({
  columnCount,
  rowIndex,
  error,
  retry,
}: Pick<TableDataState, "error" | "retry"> & { columnCount: number; rowIndex: number }) {
  const { t } = useMendyLocale();
  return (
    <TableFeedbackRow columnCount={columnCount} rowIndex={rowIndex} className="sticky bottom-0">
      <div role="alert" className="bg-background p-3">
        {error ?? t("refreshError")}
        {retry && (
          <Button onClick={retry} variant="outline" size="sm">
            {t("retry")}
          </Button>
        )}
      </div>
    </TableFeedbackRow>
  );
}
