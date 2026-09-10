import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MendyUIProvider,
  defineFilters,
  filter,
  FilterBar,
  FilterRoot,
  FilterSearch,
  FilterList,
  FilterClear,
  AppliedFilter,
  FilterSelectEditor,
  useFilters,
  remoteOptions,
} from "@mendylanda/ui/filters";
import "@mendylanda/ui/styles.css";
import "./style.css";
import { ChipFixture } from "./chip-fixture";

const params = new URLSearchParams(location.search);
const count = Math.min(2000, Number(params.get("fields") ?? 6));
const optionCount = Math.min(50000, Number(params.get("options") ?? 4));
const long = params.has("long");
const title = long ? "CustomerAccountReference".repeat(12) : "Assignee";
const choices = Array.from({ length: optionCount }, (_, i) => ({
  value: String(i),
  label:
    long && i === 0
      ? "International customer success and implementation " + "Reference".repeat(30)
      : `Person ${String(i).padStart(5, "0")}`,
}));
let failedOnce = false;
const remote = remoteOptions({
  scope: "stress",
  params: null,
  debounceMs: 0,
  async search({ query, cursor }) {
    await new Promise((resolve) => setTimeout(resolve, query === "slow" ? 300 : 20));
    if (query === "error" && !failedOnce) {
      failedOnce = true;
      throw new Error("Temporary failure");
    }
    return {
      items: [
        { value: `${query}${cursor ?? ""}`, label: `Remote ${query || "initial"}${cursor ?? ""}` },
      ],
      cursor: cursor ? null : "next",
    };
  },
  async resolve({ ids }) {
    return ids.map((value) => ({ value, label: `Remote ${value}` }));
  },
  getValue: (item) => item.value,
  getLabel: (item) => item.label,
});
const definitions = defineFilters({
  people: filter.multiSelect({
    label: title,
    chipLabel: params.has("chip-label") ? false : undefined,
    renderSummary: params.has("chip-label")
      ? () => (
          <span data-color-summary style={{ color: "rgb(22, 163, 74)" }}>
            Selected people
          </span>
        )
      : undefined,
    renderEditor: params.has("custom")
      ? ({ autoFocus }) => <input aria-label="Custom search" autoFocus={autoFocus} />
      : undefined,
    options: params.has("remote") ? remote : choices,
    searchable: params.has("no-search") ? false : undefined,
    searchLabel: "Search people",
  }),
  date: filter.dateRange({ label: "Created date" }),
  text: filter.text({ label: "Title", searchLabel: "Title contains" }),
  amount: filter.numberRange({ label: "Estimate" }),
  status: filter.select({
    label: "Status",
    removable: !params.has("required"),
    searchable: false,
    options: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
    suggestion: { value: "open" },
  }),
  ...Object.fromEntries(
    Array.from({ length: Math.max(0, count - 5) }, (_, i) => [
      `field${i}`,
      filter.text({ label: `Field ${String(i).padStart(4, "0")}`, disabled: i % 17 === 16 }),
    ]),
  ),
});
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
document.documentElement.style.setProperty("--radius", params.get("radius") ?? "0.5rem");
if (params.has("font")) document.documentElement.style.fontSize = `${params.get("font")}px`;
if (params.has("rtl")) document.documentElement.dir = "rtl";
function Fixture() {
  const [liveChoices, setLiveChoices] = useState(choices);
  useEffect(() => {
    const update = (event: Event) => {
      const {
        count = optionCount,
        remove,
        disable,
      } = (event as CustomEvent<{ count?: number; remove?: string; disable?: string }>).detail;
      setLiveChoices(
        choices
          .slice(0, count)
          .filter((item) => item.value !== remove)
          .map((item) => ({ ...item, disabled: item.value === disable })),
      );
    };
    window.addEventListener("stress-options", update);
    return () => window.removeEventListener("stress-options", update);
  }, []);
  const liveDefinitions = params.has("dynamic")
    ? {
        ...definitions,
        people: filter.multiSelect({
          label: title,
          options: liveChoices,
          searchable: params.has("no-search") ? false : undefined,
          searchLabel: "Search people",
        }),
      }
    : definitions;
  const filters = useFilters(liveDefinitions, {
    defaultValues: params.has("active")
      ? { people: choices.slice(0, Number(params.get("active") || 1)).map((item) => item.value) }
      : undefined,
  });
  return (
    <main style={{ maxWidth: Number(params.get("container") ?? 1000) }}>
      <p className="fixture-note">Synthetic data · actual npm package components</p>
      <section aria-label="Stress fixture">
        <MendyUIProvider
          menuLayout={params.has("connected") ? "connected" : undefined}
          editorAnimation={params.has("animate-editor")}
        >
          {params.has("composed") ? (
            <FilterRoot filters={filters}>
              <FilterSearch />
              <FilterList showClear={!params.has("no-clear")} />
              {params.has("custom-clear") && <FilterClear>Reset view</FilterClear>}
            </FilterRoot>
          ) : (
            <FilterBar
              filters={filters}
              showClear={!params.has("no-clear")}
              groups={
                params.has("groups")
                  ? Object.entries(liveDefinitions).map(([id, field], index) => ({
                      id,
                      label: field.label,
                      fields: [id],
                      separatorBefore: index > 0 && index % 2 === 0,
                    }))
                  : undefined
              }
            />
          )}
        </MendyUIProvider>
      </section>
      <button type="button" id="after">
        After filters
      </button>
      <output id="values">{JSON.stringify(filters.values)}</output>
    </main>
  );
}
function StandaloneFixture() {
  const [value, setValue] = useState("");
  return (
    <main>
      <AppliedFilter
        label="Stage"
        editor={
          <FilterSelectEditor
            label="Stage"
            value={value}
            onValueChange={setValue}
            removable={!params.has("required")}
            closeOnSelect={params.has("close-on-select")}
            options={[
              { value: "draft", label: "Draft" },
              { value: "ready", label: "Ready" },
            ]}
          />
        }
      >
        {value || "Choose a stage"}
      </AppliedFilter>
      <output id="selection">{value}</output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  params.has("standalone") ? (
    <StandaloneFixture />
  ) : params.has("chip-regressions") ? (
    <ChipFixture />
  ) : (
    <Fixture />
  ),
);
