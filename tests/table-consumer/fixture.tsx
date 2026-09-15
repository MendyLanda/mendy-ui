import { useState } from "react";
import { MendyUIProvider, FilterBar, defineFilters, filter, useFilters } from "@mendylanda/ui";
import { he } from "@mendylanda/ui/locales/he";
import { en } from "@mendylanda/ui/locales/en";
import { DataTable, defineColumns, format } from "@mendylanda/ui/table";

type Row = { id: string; name: string; count: number };
const rows = Array.from({ length: 1000 }, (_, i) => ({
  id: `r-${i}`,
  name: `Project ${i}`,
  count: 1234 + i,
}));
const columns = defineColumns<Row>((c) => [
  c.accessor("id", { label: "ID", pin: "start", size: 120, grow: false }),
  c.accessor("name", { label: "Project", size: 320, grow: false }),
  c.accessor("count", {
    label: "Count",
    size: 200,
    grow: false,
    align: "start",
    format: format.number({}, "he-IL"),
  }),
  c.display("actions", {
    label: "Actions",
    pin: "end",
    size: 90,
    render: () => <button>Edit</button>,
  }),
]);

export function TableConsumerFixture() {
  const params = new URLSearchParams(location.search);
  const [long, setLong] = useState(false);
  const definitions = defineFilters({
    ...(params.has("corners")
      ? Object.fromEntries(
          Array.from({ length: 9 }, (_, index) => [
            `choice${index}`,
            filter.select({
              label: `Choice ${index + 1}`,
              searchable: index === 0,
              options: Array.from({ length: index === 0 ? 20 : 2 }, (_, i) => ({
                value: String(i),
                label: `Option ${i + 1}`,
              })),
              getValue: (v) => v.value,
              getLabel: (v) => v.label,
            }),
          ]),
        )
      : {}),
    status: filter.select({
      label: long ? "כותרת ארוכה ".repeat(80) : "מצב הפרויקט",
      searchable: false,
      options: [
        { value: "active", label: "Active" },
        { value: "paused", label: "Paused" },
      ],
      getValue: (v) => v.value,
      getLabel: (v) => v.label,
    }),
  });
  const filters = useFilters(definitions);
  return (
    <MendyUIProvider locale={params.get("dir") === "ltr" ? en : he}>
      <main style={{ padding: 12 }}>
        <style>{`@font-face { font-family: Heebo; src: url(${new URL("./heebo.ttf", import.meta.url).href}); font-weight: 500; }`}</style>
        <button onClick={() => setLong(!long)}>Toggle long heading</button>
        {!params.has("toolbar") && <FilterBar filters={filters} />}
        <div style={{ height: params.has("below") ? "110vh" : 12 }} />
        <div style={{ width: params.has("wide") ? "100%" : 560, maxWidth: "100%" }}>
          <DataTable
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            label="Consumer table"
            minHeight={params.has("minimum") ? 360 : undefined}
            toolbarStart={params.has("toolbar") ? <FilterBar filters={filters} /> : undefined}
            toolbar={params.has("toolbar") ? <button>Export</button> : undefined}
            layout={params.has("below") ? "fill" : "content"}
            height={320}
          />
        </div>
      </main>
    </MendyUIProvider>
  );
}
