"use client";

import type { PrototypeVariant } from "@/examples/filter-menu-prototype/menu";
import { PrototypeMenu } from "@/examples/filter-menu-prototype/menu";
import { defineFilters, filter } from "@/registry/new-york/filter-definition";
import { FilterBar } from "@/registry/new-york/filter-bar";
import { useFilters } from "@/registry/new-york/use-filters";

import { IssueResults } from "@/examples/filters-demo";
import { issues, definitions } from "@/examples/filters-demo-data";
const prototypeDefinitions = defineFilters({
  ...definitions,
  created: filter.dateRange({ label: "Created" }),
});

export function FilterMenuPrototypeDemo({ variant }: { variant: PrototypeVariant }) {
  const filters = useFilters(prototypeDefinitions);
  const { status, priority, assignee, title, issueId } = filters.values;
  const visible = issues.filter(
    (issue) =>
      `${issue.id} ${issue.title}`.toLowerCase().includes(filters.search.trim().toLowerCase()) &&
      (!issueId?.length || issueId.includes(issue.id)) &&
      (!status || issue.status === status) &&
      (!priority || issue.priority === priority) &&
      (!assignee?.length || assignee.includes(issue.assignee)) &&
      (!title || issue.title.toLowerCase().includes(title.toLowerCase())) &&
      (!filters.values.created?.from || issue.created >= filters.values.created.from) &&
      (!filters.values.created?.to || issue.created <= filters.values.created.to),
  );
  return (
    <>
      <section className="rounded-md border" aria-label="Interactive issue filters">
        <FilterBar
          filters={filters}
          prototypeMenu={<PrototypeMenu variant={variant} />}
          searchLabel="Search issues"
          searchPlaceholder="Search or paste an issue ID"
          className="border-b p-3"
        />
        <IssueResults visible={visible} />
      </section>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Filter values</summary>
        <pre className="mt-2 overflow-auto rounded-md border p-3">
          {JSON.stringify({ search: filters.search, ...filters.values }, null, 2)}
        </pre>
      </details>
    </>
  );
}
