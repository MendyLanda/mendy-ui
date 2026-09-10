import type { ProjectFilters } from "./project-schema.fixture";
import { projectStatuses } from "./project-schema.fixture";
import { bindFilters, filter } from "@mendylanda/ui/filters";
const project = bindFilters<ProjectFilters>();
project.field("workspaceId", filter.tokens({ label: "Workspace" }));
project.field(
  "status",
  filter.multiSelect({
    label: "Status",
    options: projectStatuses.map((value) => ({ value, label: value })),
    clearValue: [],
  }),
);
project.field(
  "hasTag",
  filter.select({
    label: "Tagged",
    options: [
      { value: "with", label: "With" },
      { value: "without", label: "Without" },
    ],
  }),
  { update: (hasTag) => ({ hasTag, ...(hasTag === "without" ? { tagId: null } : {}) }) },
);
project.composite(["createdAfter", "createdBefore"], {
  field: filter.dateRange({ label: "Created" }),
  read: (state) => ({ from: state.createdAfter ?? null, to: state.createdBefore ?? null }),
  write: (value) => ({ createdAfter: value?.from ?? null, createdBefore: value?.to ?? null }),
});
project.composite(["memberCount"], {
  field: filter.numberRange({
    label: "Members",
    validate: (value) =>
      value && (value[0] === null || value[1] === null)
        ? "Both endpoints are required."
        : undefined,
  }),
  read: (state) =>
    state.memberCount?.length === 2
      ? ([state.memberCount[0]!, state.memberCount[1]!] as [number, number])
      : null,
  write: (value) => ({
    memberCount: value && value[0] !== null && value[1] !== null ? [value[0], value[1]] : null,
  }),
});
// @ts-expect-error typo must not widen the state to a generic dictionary
project.field("workspaceTypo", filter.tokens({ label: "Workspace" }));
// @ts-expect-error string tokens cannot edit numeric member ranges
project.field("memberCount", filter.tokens({ label: "Members" }));
project.field(
  "status",
  // @ts-expect-error preserve the declared status enum
  filter.multiSelect({ label: "Status", options: [{ value: "wrong", label: "Wrong" }] }),
);
project.field(
  "hasTag",
  filter.select({
    label: "Tagged",
    options: [
      { value: "with", label: "With" },
      { value: "without", label: "Without" },
    ],
  }),
  {
    // @ts-expect-error atomic updates must enforce related field types too
    update: (hasTag) => ({ hasTag, tagId: [42] }),
  },
);
