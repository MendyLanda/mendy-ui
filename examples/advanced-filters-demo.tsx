"use client";

import { useId, useRef, useState } from "react";
import { NuqsAdapter } from "nuqs/adapters/react";
import { defineFilters, filter, remoteOptions } from "@/registry/new-york/filter-definition";
import { FilterBar } from "@/registry/new-york/filter-bar";
import { useUrlFilters } from "@/registry/new-york/use-url-filters";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const people = [
  { id: "alex", name: "Alex Rivera" },
  { id: "jordan", name: "Jordan Lee" },
  { id: "mendy", name: "Mendy Landa" },
  { id: "sam", name: "Sam Cohen" },
  { id: "taylor", name: "Taylor Morgan" },
];
function waitForOptions(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 250);
    signal.addEventListener("abort", abort, { once: true });
  });
}
export function AdvancedFiltersDemo() {
  return (
    <NuqsAdapter>
      <RemoteFilters />
    </NuqsAdapter>
  );
}
function RemoteFilters() {
  const failNext = useRef(false);
  const closeId = useId();
  const [closeMenuOnApply, setCloseMenuOnApply] = useState(false);
  const source = remoteOptions({
    scope: "example-people",
    params: {},
    async search({ query, cursor, signal }) {
      await waitForOptions(signal);
      if (failNext.current) {
        failNext.current = false;
        throw new Error("The example request failed. Try again.");
      }
      const matches = people.filter((person) =>
        person.name.toLowerCase().includes(query.toLowerCase()),
      );
      const start = Number(cursor ?? 0);
      return {
        items: matches.slice(start, start + 2),
        cursor: start + 2 < matches.length ? String(start + 2) : null,
      };
    },
    async resolve({ ids, signal }) {
      await waitForOptions(signal);
      return people.filter((person) => ids.includes(person.id));
    },
    getValue: (person) => person.id,
    getLabel: (person) => person.name,
  });
  const definitions = defineFilters({
    owner: filter.options({
      label: "Owner",
      options: source,
      searchable: true,
      suggestion: { value: ["mendy"] },
      summary: { mode: "count", limit: 2 },
    }),
    created: filter.dateRange({ label: "Created date" }),
    issueId: filter.tokens({
      label: "Issue ID",
      menu: false,
      recognize: (token) => (/^ISSUE-\d+$/i.test(token) ? [token.toUpperCase()] : undefined),
      summary: { mode: "ellipsis", maxWidth: 160 },
    }),
    email: filter.tokens({
      label: "Email",
      menu: false,
      recognize: (token) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(token) ? [token] : undefined),
    }),
    ticket: filter.tokens({
      label: "Ticket",
      menu: false,
      recognize: (token) => (/^#\d+$/.test(token) ? [token] : undefined),
    }),
    reference: filter.tokens({
      label: "Reference",
      menu: false,
      recognize: (token) => (/^#\d+$/.test(token) ? [token] : undefined),
    }),
  });
  const filters = useUrlFilters(definitions, {
    scope: "advanced-example",
    searchKey: "search",
    markerKey: "_advanced",
    remember: "session",
    history: "push",
    maxUrlLength: 1000,
  });
  return (
    <section aria-label="Dynamic filters example" className="space-y-3 rounded-md border p-3">
      <FilterBar
        filters={filters}
        searchLabel="Search references"
        closeMenuOnApply={closeMenuOnApply}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          className="rounded-sm"
          id={closeId}
          checked={closeMenuOnApply}
          onCheckedChange={(checked) => setCloseMenuOnApply(checked === true)}
        />
        <Label htmlFor={closeId} className="text-xs">
          Close menu after applying
        </Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Owner options load two at a time. Paste ISSUE-123 or alex@example.com, or type them and
        press Enter. Try #123 to choose between two matching filters.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          failNext.current = true;
        }}
      >
        Fail next option request
      </Button>
      {filters.shareable && (
        <a
          className="block text-xs underline"
          href={filters.ready ? (filters.createLink("/docs/advanced") ?? undefined) : undefined}
        >
          Link to these filters
        </a>
      )}
      <details>
        <summary className="cursor-pointer text-xs">Applied values</summary>
        <pre aria-label="Dynamic filter values" className="overflow-auto pt-2 text-xs">
          {JSON.stringify({ search: filters.search, ...filters.values }, null, 2)}
        </pre>
      </details>
    </section>
  );
}
