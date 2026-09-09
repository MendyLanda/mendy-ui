import type { FilterValues } from "@mendylanda/ui/filters";
import { bindFilters, defineFilters, filter, remoteOptions } from "@mendylanda/ui/filters";
const definitions = defineFilters({
  status: filter.select({
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "closed", label: "Closed" },
    ],
  }),
  ids: filter.tokens({ label: "IDs" }),
  range: filter.numberRange({ label: "Range" }),
});
type Values = FilterValues<typeof definitions>;
const good: Values = { status: "active", ids: ["001"], range: [0, 10] };
void good;
// @ts-expect-error preserves inferred status literals
const bad: Values = { status: "made-up", ids: null, range: null };
void bad;
type Existing = {
  carrierId: string[] | null;
  status: ("active" | "closed")[] | null;
  from: string | null;
  to: string | null;
  count: number[] | null;
};
const bound = bindFilters<Existing>();
bound.field("carrierId", filter.tokens({ label: "Carriers" }));
// @ts-expect-error unknown state key
bound.field("carrierTypo", filter.tokens({ label: "Carriers" }));
// @ts-expect-error string tokens cannot bind numeric state
bound.field("count", filter.tokens({ label: "Count" }));
bound.field(
  "status",
  filter.multiSelect({
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "closed", label: "Closed" },
    ],
  }),
);
bound.field(
  "status",
  // @ts-expect-error an unrelated enum cannot bind status
  filter.multiSelect({ label: "Status", options: [{ value: "invented", label: "Wrong" }] }),
);
bound.composite(["from", "to"], {
  field: filter.dateRange({ label: "Date" }),
  read: (state) => ({ from: state.from, to: state.to }),
  write: (range) => ({ from: range?.from ?? null, to: range?.to ?? null }),
});
const source = remoteOptions({
  scope: "org:1",
  params: { carrier: "one" },
  search: async ({ params, signal }) => {
    void signal;
    return { items: [{ id: params.carrier, name: "One" }] };
  },
  resolve: async ({ ids }) => ids.map((id) => ({ id, name: id })),
  getValue: (item) => item.id,
  getLabel: (item) => item.name,
});
filter.options({ label: "Remote", options: source });

// Custom option renderers retain the original application's data type.
filter.options({
  label: "People",
  options: [{ id: "person-1", name: "Mendy", team: "Design" }],
  getValue: (person) => person.id,
  getLabel: (person) => person.name,
  renderOption: (person, { selected }) => {
    // @ts-expect-error no unknown properties on the inferred record
    void person.nonexistent;
    return selected ? person.team : person.name;
  },
});
