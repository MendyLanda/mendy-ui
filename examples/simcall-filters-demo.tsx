"use client";

import type { EditorContext } from "@/registry/new-york/filter-definition";
import { useState } from "react";
import {
  bindFilters,
  defineFilters,
  filter,
  jsonCodec,
} from "@/registry/new-york/filter-definition";
import { FilterBar } from "@/registry/new-york/filter-bar";
import { useControlledFilters } from "@/registry/new-york/use-filters";

// Representative SimCall state. The actual integration imports LineFilters from the application.
interface LineFilters {
  carrierId: string[] | null;
  carrierPlanId: string[] | null;
  status: ("active" | "suspended" | "canceled")[] | null;
  hasPendingPort: "with" | "without" | null;
  hasPendingSwap: "with" | "without" | null;
  activeStart: string | null;
  activeEnd: string | null;
  tagId: string[] | null;
  hasTag: "with" | "without" | null;
  vendorCompanyId: string[] | null;
  groupMemberCount: [number | null, number | null] | null;
  q: string[] | null;
}
const empty: LineFilters = {
  carrierId: null,
  carrierPlanId: null,
  status: null,
  hasPendingPort: null,
  hasPendingSwap: null,
  activeStart: null,
  activeEnd: null,
  tagId: null,
  hasTag: null,
  vendorCompanyId: null,
  groupMemberCount: null,
  q: null,
};
const line = bindFilters<LineFilters>();
const carriers = [
  { value: "north", label: "North" },
  { value: "south", label: "South" },
];
const plans = [
  { value: "north-voice", label: "North voice", carrier: "north" },
  { value: "north-data", label: "North data", carrier: "north" },
  { value: "south-voice", label: "South voice", carrier: "south" },
];
const companies = [
  { id: "one", name: "Company One", vendor: "North vendor" },
  { id: "two", name: "Company Two", vendor: "North vendor" },
  { id: "three", name: "Company Three", vendor: "South vendor" },
];
function CompanyEditor({ value, setValue, apply }: EditorContext<string[] | null>) {
  return (
    <fieldset className="w-56 space-y-2">
      <legend className="mb-2 text-sm font-medium">Vendor companies</legend>
      {companies.map((company) => (
        <label key={company.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value?.includes(company.id) ?? false}
            onChange={(event) => {
              const next = event.target.checked
                ? [...(value ?? []), company.id]
                : (value?.filter((id) => id !== company.id) ?? []);
              setValue(next.length ? next : null);
            }}
          />
          {company.name}
        </label>
      ))}
      <button type="button" onClick={() => apply()} className="text-sm underline">
        Done
      </button>
    </fieldset>
  );
}
function companySummary(value: string[] | null) {
  const groups = new Map<string, typeof companies>();
  for (const company of companies)
    groups.set(company.vendor, [...(groups.get(company.vendor) ?? []), company]);
  return [...groups.entries()]
    .flatMap(([vendor, members]) =>
      members.every((company) => value?.includes(company.id))
        ? [vendor]
        : members.filter((company) => value?.includes(company.id)).map((company) => company.name),
    )
    .join(", ");
}
const strings = jsonCodec(
  (value): value is string[] | null =>
    value === null || (Array.isArray(value) && value.every((item) => typeof item === "string")),
);
function useLineDefinitions(value: LineFilters) {
  // In SimCall these arrays come from its existing query hooks using value.carrierId.
  const availablePlans = plans.filter(
    (plan) => !value.carrierId?.length || value.carrierId.includes(plan.carrier),
  );
  return defineFilters({
    carrier: line.field(
      "carrierId",
      filter.multiSelect({ label: "Carrier", options: carriers, searchable: true }),
    ),
    plan: line.field(
      "carrierPlanId",
      filter.multiSelect({
        label: "Plan",
        options: {
          kind: "external",
          items: availablePlans,
          selectedItems: plans.filter((plan) => value.carrierPlanId?.includes(plan.value)),
        },
        searchable: true,
      }),
    ),
    status: line.field(
      "status",
      filter.multiSelect({
        label: "Status",
        options: [
          { value: "active", label: "Active" },
          { value: "suspended", label: "Suspended" },
          { value: "canceled", label: "Canceled" },
        ],
        defaultValue: ["active", "suspended"],
        clearValue: [],
      }),
    ),
    port: line.field(
      "hasPendingPort",
      filter.select({
        label: "Pending port",
        options: [
          { value: "with", label: "With pending port" },
          { value: "without", label: "Without pending port" },
        ],
      }),
    ),
    swap: line.field(
      "hasPendingSwap",
      filter.select({
        label: "Pending swap",
        options: [
          { value: "with", label: "With pending swap" },
          { value: "without", label: "Without pending swap" },
        ],
      }),
    ),
    activation: line.composite(["activeStart", "activeEnd"], {
      field: filter.dateRange({ label: "Activation date" }),
      read: (state) =>
        state.activeStart || state.activeEnd
          ? { from: state.activeStart, to: state.activeEnd }
          : null,
      write: (range) => ({ activeStart: range?.from ?? null, activeEnd: range?.to ?? null }),
    }),
    tags: line.field(
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
    tagged: line.field(
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
    companies: line.field(
      "vendorCompanyId",
      filter.custom({
        label: "Companies",
        defaultValue: null as string[] | null,
        clearValue: null,
        codec: strings,
        renderEditor: (context) => <CompanyEditor {...context} />,
        renderSummary: companySummary,
      }),
    ),
    members: line.field("groupMemberCount", filter.numberRange({ label: "Member count" })),
  });
}
function LineSet({ label, defaults }: { label: string; defaults: LineFilters }) {
  const [value, setValue] = useState(defaults);
  const definitions = useLineDefinitions(value);
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
          { id: "status-menu", label: "Status", fields: ["status", "port", "swap"] },
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
export function SimCallFiltersDemo() {
  return (
    <div className="space-y-4">
      <LineSet label="Lines filters" defaults={{ ...empty, status: ["active", "suspended"] }} />
      <LineSet label="Sourcing draft" defaults={empty} />
    </div>
  );
}
