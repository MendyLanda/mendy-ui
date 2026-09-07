"use client";

import type { EditorContext } from "@/registry/new-york/filter-definition";
import { useId, useState } from "react";
import {
  bindFilters,
  defineFilters,
  filter,
  jsonCodec,
} from "@/registry/new-york/filter-definition";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FilterBar } from "@/registry/new-york/filter-bar";
import { useControlledFilters } from "@/registry/new-york/use-filters";

// Existing application state can keep its own field names and query shape.
interface ProjectFilters {
  workspaceId: string[] | null;
  projectId: string[] | null;
  status: ("active" | "paused" | "archived")[] | null;
  hasOpenTasks: "with" | "without" | null;
  hasReviews: "with" | "without" | null;
  createdAfter: string | null;
  createdBefore: string | null;
  tagId: string[] | null;
  hasTag: "with" | "without" | null;
  memberId: string[] | null;
  teamSize: [number | null, number | null] | null;
  q: string[] | null;
}
const empty: ProjectFilters = {
  workspaceId: null,
  projectId: null,
  status: null,
  hasOpenTasks: null,
  hasReviews: null,
  createdAfter: null,
  createdBefore: null,
  tagId: null,
  hasTag: null,
  memberId: null,
  teamSize: null,
  q: null,
};
const project = bindFilters<ProjectFilters>();
const workspaces = [
  { value: "design", label: "Design" },
  { value: "engineering", label: "Engineering" },
];
const projects = [
  { value: "design-web", label: "Website", workspace: "design" },
  { value: "design-mobile", label: "Mobile app", workspace: "design" },
  { value: "engineering-api", label: "API", workspace: "engineering" },
];
const members = [
  { id: "one", name: "Alex Rivera", team: "Design team" },
  { id: "two", name: "Jordan Lee", team: "Design team" },
  { id: "three", name: "Sam Cohen", team: "Engineering team" },
];
function MemberEditor({ value, setValue }: EditorContext<string[] | null>) {
  const id = useId();
  return (
    <fieldset className="w-56 space-y-2">
      <legend className="mb-2 text-sm font-medium">Team members</legend>
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-2">
          <Checkbox
            className="rounded-sm"
            id={`${id}-${member.id}`}
            checked={value?.includes(member.id) ?? false}
            onCheckedChange={(checked) => {
              const next =
                checked === true
                  ? [...(value ?? []), member.id]
                  : (value?.filter((id) => id !== member.id) ?? []);
              setValue(next.length ? next : null);
            }}
          />
          <Label htmlFor={`${id}-${member.id}`}>{member.name}</Label>
        </div>
      ))}
    </fieldset>
  );
}
function memberSummary(value: string[] | null) {
  const groups = new Map<string, typeof members>();
  for (const member of members)
    groups.set(member.team, [...(groups.get(member.team) ?? []), member]);
  return [...groups.entries()]
    .flatMap(([team, members]) =>
      members.every((member) => value?.includes(member.id))
        ? [team]
        : members.filter((member) => value?.includes(member.id)).map((member) => member.name),
    )
    .join(", ");
}
const strings = jsonCodec(
  (value): value is string[] | null =>
    value === null || (Array.isArray(value) && value.every((item) => typeof item === "string")),
);
function useProjectDefinitions(value: ProjectFilters) {
  // An application can supply these arrays from its existing query hooks.
  const availableProjects = projects.filter(
    (project) => !value.workspaceId?.length || value.workspaceId.includes(project.workspace),
  );
  return defineFilters({
    workspace: project.field(
      "workspaceId",
      filter.multiSelect({ label: "Workspace", options: workspaces, searchable: true }),
    ),
    project: project.field(
      "projectId",
      filter.multiSelect({
        label: "Project",
        options: {
          kind: "external",
          items: availableProjects,
          selectedItems: projects.filter((project) => value.projectId?.includes(project.value)),
        },
        searchable: true,
      }),
    ),
    status: project.field(
      "status",
      filter.multiSelect({
        label: "Status",
        options: [
          { value: "active", label: "Active" },
          { value: "paused", label: "Paused" },
          { value: "archived", label: "Archived" },
        ],
        defaultValue: ["active", "paused"],
        clearValue: [],
      }),
    ),
    tasks: project.field(
      "hasOpenTasks",
      filter.select({
        label: "Open tasks",
        options: [
          { value: "with", label: "With open tasks" },
          { value: "without", label: "Without open tasks" },
        ],
      }),
    ),
    reviews: project.field(
      "hasReviews",
      filter.select({
        label: "Reviews",
        options: [
          { value: "with", label: "With reviews" },
          { value: "without", label: "Without reviews" },
        ],
      }),
    ),
    created: project.composite(["createdAfter", "createdBefore"], {
      field: filter.dateRange({ label: "Created date" }),
      read: (state) =>
        state.createdAfter || state.createdBefore
          ? { from: state.createdAfter, to: state.createdBefore }
          : null,
      write: (range) => ({ createdAfter: range?.from ?? null, createdBefore: range?.to ?? null }),
    }),
    tags: project.field(
      "tagId",
      filter.options({
        label: "Tags",
        options: [
          { value: "priority", label: "Priority" },
          { value: "review", label: "Review" },
        ],
      }),
      {
        update: (tagId, current) => ({
          tagId,
          hasTag: current.hasTag === "without" ? null : current.hasTag,
        }),
      },
    ),
    tagged: project.field(
      "hasTag",
      filter.select({
        label: "Tagged",
        options: [
          { value: "with", label: "Has tags" },
          { value: "without", label: "No tags" },
        ],
      }),
      { update: (hasTag) => ({ hasTag, ...(hasTag === "without" ? { tagId: null } : {}) }) },
    ),
    members: project.field(
      "memberId",
      filter.custom({
        label: "Members",
        defaultValue: null as string[] | null,
        clearValue: null,
        codec: strings,
        renderEditor: (context) => <MemberEditor {...context} />,
        renderSummary: memberSummary,
      }),
    ),
    size: project.field("teamSize", filter.numberRange({ label: "Team size" })),
  });
}
function ProjectSet({ label, defaults }: { label: string; defaults: ProjectFilters }) {
  const [value, setValue] = useState(defaults);
  const definitions = useProjectDefinitions(value);
  const filters = useControlledFilters({
    definitions,
    value,
    onPatch: (patch) => setValue((current) => ({ ...current, ...patch })),
    search: {
      read: (current) => current.q?.join(", ") ?? "",
      write: (text) => ({
        q: text
          ? text
              .split(/[\r\n,]+/)
              .map((part) => part.trim())
              .filter(Boolean)
          : null,
      }),
    },
  });
  return (
    <section aria-label={label} className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">{label}</p>
      <FilterBar
        filters={filters}
        groups={[
          { id: "status-menu", label: "Status", fields: ["status", "tasks", "reviews"] },
          { id: "tags-menu", label: "Tags", fields: ["tags", "tagged"] },
        ]}
      />
      <details>
        <summary className="cursor-pointer text-xs">Applied values</summary>
        <pre aria-label={`${label} values`} className="overflow-auto pt-2 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    </section>
  );
}
export function ProjectFiltersDemo() {
  return (
    <div className="space-y-4">
      <ProjectSet label="Project filters" defaults={{ ...empty, status: ["active", "paused"] }} />
      <ProjectSet label="Saved view draft" defaults={empty} />
    </div>
  );
}
