import { defineFilters, filter } from "@/registry/new-york/filter-definition";

export const issues = [
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
].map((issue, index) => ({ ...issue, created: `2026-09-${String(8 - index).padStart(2, "0")}` }));
export const statuses = [
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
export const definitions = defineFilters({
  issueId: filter.tokens({
    label: "Issue ID",
    menu: false,
    recognize: (token) => (/^UI-\d+$/i.test(token) ? [token.toUpperCase()] : undefined),
  }),
  status: filter.select({ label: "Status", options: statuses, suggestion: { value: "todo" } }),
  priority: filter.select({ label: "Priority", options: priorities }),
  assignee: filter.multiSelect({
    label: "Assignee",
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
