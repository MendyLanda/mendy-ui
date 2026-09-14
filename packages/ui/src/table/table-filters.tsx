"use client";

import type { ComponentProps } from "react";
import {
  FilterBar,
  FilterRoot,
  FilterMenu,
  FilterList,
  FilterFeedback,
} from "../filters/filter-bar.js";

export type TableFiltersProps = ComponentProps<typeof FilterBar> & {
  /** Hide the free-text search when the query only supports defined filters. */
  showSearch?: boolean;
};

/** Use the same controller here and on TableView when composing a custom toolbar. */
export function TableFilters({ showSearch = true, ...props }: TableFiltersProps) {
  if (showSearch) return <FilterBar {...props} />;
  return (
    <FilterRoot {...props}>
      <FilterMenu />
      <FilterList showClear={props.showClear} />
      <FilterFeedback />
    </FilterRoot>
  );
}
