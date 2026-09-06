"use client";

import { useRef, useState } from "react";
import { Circle, CircleCheck, Clock3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppliedFilter } from "@/registry/new-york/filters";
import { FilterTextEditor } from "@/registry/new-york/filter-text-editor";
import {
  FilterSelectEditor,
  FilterMultiSelectEditor,
} from "@/registry/new-york/filter-select-editor";

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
    title: "Hold text drafts locally until Apply",
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
type FilterKey = "status" | "priority" | "assignee" | "title";
const filterNames: Record<FilterKey, string> = {
  status: "Status",
  priority: "Priority",
  assignee: "Assignee",
  title: "Title",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "done")
    return (
      <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
    );
  if (status === "in-progress")
    return <Clock3 className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  return <Circle className="size-3.5 text-muted-foreground" aria-hidden="true" />;
}

export function FiltersDemo() {
  const addFilterRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<FilterKey[]>(["status", "assignee"]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [titleOpen, setTitleOpen] = useState(false);
  const visible = issues.filter(
    (issue) =>
      (!active.includes("status") || !status || issue.status === status) &&
      (!active.includes("priority") || !priority || issue.priority === priority) &&
      (!active.includes("assignee") || !assignees.length || assignees.includes(issue.assignee)) &&
      (!active.includes("title") || issue.title.toLowerCase().includes(title.toLowerCase())),
  );
  function remove(key: FilterKey) {
    setActive((current) => current.filter((item) => item !== key));
    if (key === "status") setStatus("");
    if (key === "priority") setPriority("");
    if (key === "assignee") setAssignees([]);
    if (key === "title") {
      setTitle("");
      setTitleOpen(false);
    }
    requestAnimationFrame(() => addFilterRef.current?.focus());
  }
  const remaining = (Object.keys(filterNames) as FilterKey[]).filter(
    (key) => !active.includes(key),
  );

  return (
    <section className="rounded-md border" aria-label="Interactive issue filters">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        {active.includes("status") && (
          <AppliedFilter
            label="Status"
            onRemove={() => remove("status")}
            editor={
              <FilterSelectEditor
                label="Status"
                value={status}
                onValueChange={setStatus}
                options={[{ value: "", label: "Any status" }, ...statuses]}
              />
            }
          >
            <span>Status:</span>
            <span>{statuses.find((item) => item.value === status)?.label ?? "Any"}</span>
          </AppliedFilter>
        )}
        {active.includes("priority") && (
          <AppliedFilter
            label="Priority"
            onRemove={() => remove("priority")}
            editor={
              <FilterSelectEditor
                label="Priority"
                value={priority}
                onValueChange={setPriority}
                options={[{ value: "", label: "Any priority" }, ...priorities]}
              />
            }
          >
            <span>Priority:</span>
            <span>{priorities.find((item) => item.value === priority)?.label ?? "Any"}</span>
          </AppliedFilter>
        )}
        {active.includes("assignee") && (
          <AppliedFilter
            label="Assignee"
            onRemove={() => remove("assignee")}
            editor={
              <FilterMultiSelectEditor
                label="Search assignees"
                searchable
                values={assignees}
                onValuesChange={setAssignees}
                options={people}
              />
            }
          >
            <span>Assignee:</span>
            <span className="max-w-40 truncate">
              {assignees.length ? assignees.join(", ") : "Anyone"}
            </span>
          </AppliedFilter>
        )}
        {active.includes("title") && (
          <AppliedFilter
            label="Title"
            open={titleOpen}
            onOpenChange={setTitleOpen}
            onRemove={() => remove("title")}
            editor={
              <FilterTextEditor
                label="Title contains"
                defaultValue={title}
                onApply={(value) => {
                  setTitle(value.trim());
                  setTitleOpen(false);
                }}
              />
            }
          >
            <span>Title:</span>
            <span className="max-w-32 truncate">{title || "Any"}</span>
          </AppliedFilter>
        )}
        {remaining.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={addFilterRef}
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
              >
                <Plus className="size-3.5" />
                Add filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {remaining.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => setActive((current) => [...current, key])}
                >
                  {filterNames[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {active.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-none px-2 font-normal text-muted-foreground underline hover:bg-transparent"
            onClick={() => {
              setActive([]);
              setStatus("");
              setPriority("");
              setAssignees([]);
              setTitle("");
              setTitleOpen(false);
              requestAnimationFrame(() => addFilterRef.current?.focus());
            }}
          >
            Clear all
          </Button>
        )}
      </div>
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
