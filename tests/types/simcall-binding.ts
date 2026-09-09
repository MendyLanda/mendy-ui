import type { LineFilters } from "./simcall-schema.fixture";
import { lineStatuses } from "./simcall-schema.fixture";
import { bindFilters, filter } from "@mendylanda/ui/filters";
const line = bindFilters<LineFilters>();
line.field("carrierId", filter.tokens({ label: "Carrier" }));
line.field(
  "status",
  filter.multiSelect({
    label: "Status",
    options: lineStatuses.map((value) => ({ value, label: value })),
    clearValue: [],
  }),
);
line.field(
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
line.composite(["activeStart", "activeEnd"], {
  field: filter.dateRange({ label: "Activation" }),
  read: (state) => ({ from: state.activeStart ?? null, to: state.activeEnd ?? null }),
  write: (value) => ({ activeStart: value?.from ?? null, activeEnd: value?.to ?? null }),
});
line.composite(["groupMemberCount"], {
  field: filter.numberRange({
    label: "Members",
    validate: (value) =>
      value && (value[0] === null || value[1] === null)
        ? "Both endpoints are required."
        : undefined,
  }),
  read: (state) =>
    state.groupMemberCount?.length === 2
      ? ([state.groupMemberCount[0]!, state.groupMemberCount[1]!] as [number, number])
      : null,
  write: (value) => ({
    groupMemberCount: value && value[0] !== null && value[1] !== null ? [value[0], value[1]] : null,
  }),
});
// @ts-expect-error typo must not widen the state to a generic dictionary
line.field("carrierTypo", filter.tokens({ label: "Carrier" }));
// @ts-expect-error string tokens cannot edit numeric member ranges
line.field("groupMemberCount", filter.tokens({ label: "Members" }));
line.field(
  "status",
  // @ts-expect-error preserve the actual backend status enum
  filter.multiSelect({ label: "Status", options: [{ value: "wrong", label: "Wrong" }] }),
);
line.field(
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
