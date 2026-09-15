"use client";

import { Circle, CircleCheck, Clock3, Flag, Users } from "lucide-react";
import { DataTable, defineColumns, useDataTable } from "@mendylanda/ui/table";
import { NuqsAdapter } from "nuqs/adapters/react";
import { defineFilters, filter } from "@mendylanda/ui/filters";
import { useUrlFilters } from "@mendylanda/ui/filters/nuqs";

const issues = [
  {
    id: "UI-042",
    title: "Restore focus to the trigger after Escape",
    status: "in-progress",
    priority: "high",
    assignee: "Mendy",
  },
  {
    id: "UI-041",
    title: "Show an empty state when no rows match",
    status: "todo",
    priority: "medium",
    assignee: "Alex",
  },
  {
    id: "UI-040",
    title: "Add keyboard navigation to the option list",
    status: "in-progress",
    priority: "high",
    assignee: "Sam",
  },
  {
    id: "UI-039",
    title: "Write the installation guide",
    status: "done",
    priority: "medium",
    assignee: "Mendy",
  },
  {
    id: "UI-038",
    title: "Fix chip hover contrast in dark mode",
    status: "todo",
    priority: "low",
    assignee: "Jordan",
  },
  {
    id: "UI-037",
    title: "Wrap filter chips on narrow screens",
    status: "in-progress",
    priority: "high",
    assignee: "Alex",
  },
  {
    id: "UI-036",
    title: "Label edit and remove buttons for screen readers",
    status: "done",
    priority: "high",
    assignee: "Sam",
  },
  {
    id: "UI-035",
    title: "Save text filters with Enter",
    status: "todo",
    priority: "medium",
    assignee: "Mendy",
  },
];
const statuses = [
  { value: "todo", label: "Todo" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];
const priorities = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];
const people = ["Mendy", "Alex", "Sam", "Jordan"].map((name) => ({ value: name, label: name }));
function StatusIcon({ status }: { status: string }) {
  if (status === "done")
    return (
      <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
    );
  if (status === "in-progress")
    return <Clock3 className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  return <Circle className="size-3.5 text-muted-foreground" aria-hidden="true" />;
}

const definitions = defineFilters({
  issueId: filter.tokens({
    label: "Issue ID",
    menu: false,
    recognize: (token) => (/^UI-\d+$/i.test(token) ? [token.toUpperCase()] : undefined),
  }),
  status: filter.select({
    label: "Status",
    searchable: false,
    options: statuses,
    suggestion: { value: "todo" },
  }),
  priority: filter.select({
    label: "Priority",
    searchable: false,
    icon: <Flag />,
    options: priorities,
  }),
  assignee: filter.multiSelect({
    label: "Assignee",
    icon: <Users />,
    options: people,
    searchLabel: "Search assignees",
    editorLabel: "Choose assignees",
    suggestion: { value: ["Mendy"] },
  }),
  title: filter.text({
    label: "Title",
    searchLabel: "Title contains",
    validate: (value) => (value ? undefined : "Enter a title to search for."),
  }),
});

const columns = defineColumns<(typeof issues)[number]>((column) => [
  column.accessor("id", { label: "ID", size: 110, grow: false, pin: "start" }),
  column.accessor("title", { label: "Issue", size: 380, grow: 2 }),
  column.accessor("status", {
    label: "Status",
    size: 150,
    render: ({ value }) => (
      <span className="flex items-center gap-2">
        <StatusIcon status={value} />
        {statuses.find((item) => item.value === value)?.label}
      </span>
    ),
    copy: (value) => statuses.find((item) => item.value === value)?.label ?? value,
  }),
  column.accessor("priority", {
    label: "Priority",
    size: 110,
    render: ({ value }) => <span className="capitalize">{value}</span>,
  }),
  column.accessor("assignee", { label: "Assignee", size: 130 }),
]);

export function FiltersDemo() {
  return (
    <NuqsAdapter>
      <IssueFilters />
    </NuqsAdapter>
  );
}

function IssueFilters() {
  const filters = useUrlFilters(definitions, { scope: "issues" });
  const { status, priority, assignee, title, issueId } = filters.values;
  const visible = issues.filter(
    (issue) =>
      `${issue.id} ${issue.title}`.toLowerCase().includes(filters.search.trim().toLowerCase()) &&
      (!issueId?.length || issueId.includes(issue.id)) &&
      (!status || issue.status === status) &&
      (!priority || issue.priority === priority) &&
      (!assignee?.length || assignee.includes(issue.assignee)) &&
      (!title || issue.title.toLowerCase().includes(title.toLowerCase())),
  );
  const table = useDataTable({
    rows: visible,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });
  return (
    <section aria-label="Interactive issue filters" className="min-w-0">
      <DataTable
        table={table}
        filters={filters}
        label="Issues"
        height={397}
        filterBar={{
          searchLabel: "Search issues",
          searchPlaceholder: "Search or paste an issue ID",
        }}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span role="status">
              {visible.length} of {issues.length} issues
            </span>
            <span>Drag to select cells. Copy with ⌘C or Ctrl+C.</span>
          </div>
        }
      />
    </section>
  );
}
