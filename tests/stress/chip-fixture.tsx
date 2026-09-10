import { useState } from "react";
import {
  defineFilters,
  externalOptions,
  remoteOptions,
  filter,
  FilterBar,
  MendyUIProvider,
  useFilters,
} from "@mendylanda/ui/filters";

const remote = remoteOptions({
  scope: "chip-labels",
  params: null,
  search: async () => ({ items: [] }),
  resolve: ({ signal }) =>
    new Promise<{ value: string; label: string }[]>((resolve, reject) => {
      const settle = (event: Event) => {
        const phase = (event as CustomEvent<string>).detail;
        if (phase === "error") reject(new Error("Query failed"));
        else resolve(phase === "ready" ? [{ value: "person-12345", label: "Ada Lovelace" }] : []);
      };
      window.addEventListener("resolve-chip-labels", settle, { once: true, signal });
    }),
  getValue: (item) => item.value,
  getLabel: (item) => item.label,
});

/** Exercises a consumer-owned query separately from the option search lifecycle. */
export function ChipFixture() {
  const [phase, setPhase] = useState("loading");
  const options = new URLSearchParams(location.search).has("remote-labels")
    ? remote
    : externalOptions({
        items: phase === "ready" ? [{ value: "person-12345", label: "Ada Lovelace" }] : [],
        loading: phase === "loading" || phase === "refetch",
        error: phase === "error" ? "Query failed" : undefined,
      });
  const definitions = defineFilters({
    owner: filter.multiSelect({ label: "Owner", options }),
    custom: filter.multiSelect({
      label: "Custom",
      options,
      renderSummary: (_value, choices) => (
        <span data-custom-summary>{choices.map((item) => item.label).join(", ")}</span>
      ),
      renderEditor: ({ autoFocus }) => (
        <input aria-label="Custom search" autoFocus={autoFocus} style={{ width: "100%" }} />
      ),
    }),
    status: filter.select({
      label: "Status",
      options: [{ value: "open", label: "Open" }],
      searchable: false,
    }),
    identifier: filter.text({ label: "Identifier" }),
  });
  const filters = useFilters(definitions, {
    defaultValues: {
      owner: ["person-12345"],
      custom: ["person-12345"],
      status: "open",
      identifier: "raw-123",
    },
  });
  return (
    <main>
      <MendyUIProvider menuLayout="anchored">
        <FilterBar filters={filters} />
      </MendyUIProvider>
      {["ready", "refetch", "error", "missing", "loading"].map((next) => (
        <button
          key={next}
          onClick={() => {
            setPhase(next);
            window.dispatchEvent(new CustomEvent("resolve-chip-labels", { detail: next }));
          }}
        >
          {next}
        </button>
      ))}
    </main>
  );
}
