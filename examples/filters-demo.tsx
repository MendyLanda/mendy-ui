"use client";

import { useRef, useState } from "react";
import { Circle, CircleCheck, Clock3, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppliedFilter, FilterMenuItem } from "@/registry/new-york/filters";
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
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleDraftKey, setTitleDraftKey] = useState(0);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [titleOpen, setTitleOpen] = useState(false);
  const active = (Object.keys(filterNames) as FilterKey[]).filter((key) =>
    key === "status"
      ? Boolean(status)
      : key === "priority"
        ? Boolean(priority)
        : key === "assignee"
          ? assignees.length > 0
          : Boolean(title),
  );
  const visible = issues.filter(
    (issue) =>
      `${issue.id} ${issue.title}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (!active.includes("status") || !status || issue.status === status) &&
      (!active.includes("priority") || !priority || issue.priority === priority) &&
      (!active.includes("assignee") || !assignees.length || assignees.includes(issue.assignee)) &&
      (!active.includes("title") || issue.title.toLowerCase().includes(title.toLowerCase())),
  );
  function remove(key: FilterKey) {
    if (key === "status") setStatus("");
    if (key === "priority") setPriority("");
    if (key === "assignee") setAssignees([]);
    if (key === "title") {
      setTitle("");
      setTitleOpen(false);
    }
    requestAnimationFrame(() => addFilterRef.current?.focus());
  }

  return (
    <section className="rounded-md border" aria-label="Interactive issue filters">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <div className="relative w-full shrink-0 sm:w-[350px]">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              ref={searchRef}
              type="search"
              aria-label="Search issues"
              placeholder="Search or filter"
              className={`w-full rounded-none pl-9 text-sm [&::-webkit-search-cancel-button]:appearance-none ${query ? "pr-16" : "pr-9"}`}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-8 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm opacity-50 transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
              >
                <X className="size-[15px]" aria-hidden="true" />
              </button>
            )}
            <DropdownMenuTrigger asChild>
              <button
                ref={addFilterRef}
                type="button"
                aria-label="Open filters"
                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-sm transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:opacity-100 ${active.length ? "opacity-100" : "opacity-50"}`}
              >
                <ListFilter className="size-[17px]" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent
            inert={!menuOpen}
            aria-hidden={!menuOpen || undefined}
            onCloseAutoFocus={(event) => {
              const focused = document.activeElement;
              if (
                event.target instanceof HTMLElement &&
                focused &&
                focused !== document.body &&
                !event.target.contains(focused)
              )
                event.preventDefault();
            }}
            align="end"
            sideOffset={12}
            alignOffset={-12}
            className="w-[min(350px,calc(100vw-2rem))]"
            loop
          >
            <FilterMenuItem
              label="Status"
              contentProps={{
                role: "dialog",
                "aria-label": "Choose status",
                "aria-orientation": undefined,
                "aria-hidden": !menuOpen || undefined,
                inert: !menuOpen,
              }}
            >
              <FilterSelectEditor
                label="Status"
                value={status}
                onValueChange={setStatus}
                options={statuses}
              />
            </FilterMenuItem>
            <FilterMenuItem
              label="Priority"
              contentProps={{
                role: "dialog",
                "aria-label": "Choose priority",
                "aria-orientation": undefined,
                "aria-hidden": !menuOpen || undefined,
                inert: !menuOpen,
              }}
            >
              <FilterSelectEditor
                label="Priority"
                value={priority}
                onValueChange={setPriority}
                options={priorities}
              />
            </FilterMenuItem>
            <FilterMenuItem
              label="Assignee"
              contentProps={{
                role: "dialog",
                "aria-label": "Choose assignees",
                "aria-orientation": undefined,
                "aria-hidden": !menuOpen || undefined,
                inert: !menuOpen,
              }}
            >
              <FilterMultiSelectEditor
                label="Search assignees"
                searchable
                values={assignees}
                onValuesChange={setAssignees}
                options={people}
              />
            </FilterMenuItem>
            <FilterMenuItem
              label="Title"
              onOpenChange={(open) => {
                if (open) setTitleDraftKey((key) => key + 1);
              }}
              contentProps={{
                role: "dialog",
                "aria-label": "Set title filter",
                "aria-orientation": undefined,
                "aria-hidden": !menuOpen || undefined,
                inert: !menuOpen,
              }}
            >
              <FilterTextEditor
                key={titleDraftKey}
                label="Title contains"
                defaultValue={title}
                validate={(value) => (value.trim() ? undefined : "Enter a title to search for.")}
                onApply={(value) => {
                  setTitle(value.trim());
                  setMenuOpen(false);
                }}
              />
            </FilterMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {active.includes("status") && (
          <AppliedFilter
            label="Status"
            onRemove={() => remove("status")}
            editor={
              <FilterSelectEditor
                label="Status"
                value={status}
                onValueChange={(value) => (value ? setStatus(value) : remove("status"))}
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
                onValueChange={(value) => (value ? setPriority(value) : remove("priority"))}
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
                onValuesChange={(values) =>
                  values.length ? setAssignees(values) : remove("assignee")
                }
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
                  if (value.trim()) setTitle(value.trim());
                  else remove("title");
                  setTitleOpen(false);
                }}
              />
            }
          >
            <span>Title:</span>
            <span className="max-w-32 truncate">{title || "Any"}</span>
          </AppliedFilter>
        )}
        {(active.length > 0 || query) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-none px-2 font-normal text-muted-foreground underline hover:bg-transparent"
            onClick={() => {
              setQuery("");
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
