"use client";

import { Circle, CircleCheck, Clock3, Flag, Users } from "lucide-react";
import { NuqsAdapter } from "nuqs/adapters/react";
import { defineFilters, filter } from "@mendylanda/ui/filters";
import { FilterBar } from "@mendylanda/ui/filters";
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
  status: filter.select({ label: "Status", options: statuses, suggestion: { value: "todo" } }),
  priority: filter.select({ label: "Priority", icon: <Flag />, options: priorities }),
  assignee: filter.multiSelect({
    label: "Assignee",
    icon: <Users />,
    options: people,
    searchable: true,
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
  return (
    <section className="rounded-md border" aria-label="Interactive issue filters">
      <FilterBar
        filters={filters}
        searchLabel="Search issues"
        searchPlaceholder="Search or paste an issue ID"
        className="border-b p-3"
      />
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Scrollable issues table"
      >
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Issues matching the selected filters</caption>
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th scope="col" className="px-3 py-2 font-normal">
                Issue
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Status
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Priority
              </th>
              <th scope="col" className="px-3 py-2 font-normal">
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((issue) => (
              <tr key={issue.id} className="border-b last:border-b-0 hover:bg-muted">
                <td className="px-3 py-2">
                  <span className="mr-3 font-mono text-xs text-muted-foreground">{issue.id}</span>
                  {issue.title}
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <StatusIcon status={issue.status} />
                    {statuses.find((item) => item.value === issue.status)?.label}
                  </span>
                </td>
                <td className="px-3 py-2 capitalize text-muted-foreground">{issue.priority}</td>
                <td className="px-3 py-2">{issue.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="space-y-1 p-8 text-center">
            <p className="text-sm">No matching issues</p>
            <p className="text-xs text-muted-foreground">Change or remove a filter.</p>
          </div>
        )}
      </div>
      <div role="status" className="border-t px-3 py-2 text-xs text-muted-foreground">
        {visible.length} of {issues.length} issues
      </div>
    </section>
  );
}
