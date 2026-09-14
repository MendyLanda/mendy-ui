import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DataTable,
  defineColumns,
  selectionColumn,
  useDataTable,
  useResultSelection,
  tableCsv,
} from "@mendylanda/ui/table";
import "@mendylanda/ui/styles.css";
import { TableDefaultsFixture, type TableDefaultsMode } from "../table-defaults/fixture";
import { TableFillLayoutFixture } from "../table-fill-layout/fixture";
type Item = { id: string; title: string; amount: number };
const allRows = Array.from({ length: 10000 }, (_, i) => ({
  id: `item-${i}`,
  title: i === 4 ? "Very long title ".repeat(100) : `Item ${i}`,
  amount: i,
}));
const columns = defineColumns<Item>((c) => [
  selectionColumn<Item>(),
  c.accessor("title", { label: "Title", size: 220 }),
  c.accessor("amount", { label: "Amount", size: 100 }),
  c.display("actions", {
    label: "Actions",
    pin: "end",
    size: 100,
    render: (row) => (
      <button onClick={() => window.dispatchEvent(new CustomEvent("edit", { detail: row.id }))}>
        Edit
      </button>
    ),
  }),
]);
function App() {
  const [scope, setScope] = useState("one");
  const [page, setPage] = useState(0);
  const [mode, setMode] = useState<"loading" | "ready" | "error">("ready");
  const [many, setMany] = useState(false);
  const [autoLoad, setAutoLoad] = useState(false);
  const [loads, setLoads] = useState(0);
  const [edit, setEdit] = useState("");
  const rows =
    mode === "ready"
      ? autoLoad
        ? allRows.slice(0, 50)
        : many
          ? allRows
          : allRows.slice(page * 20, page * 20 + 20)
      : [];
  const selection = useResultSelection({
    scope: { key: scope, value: { search: scope } },
    rowIds: rows.map((r) => r.id),
    totalCount: 10000,
  });
  const table = useDataTable({
    rows,
    columns,
    getRowId: (r) => r.id,
    state: { rowSelection: selection.rowSelection },
    onRowSelectionChange: selection.onRowSelectionChange,
    preferences: { key: "fixture", scope },
  });
  React.useEffect(() => {
    const fn = (e: Event) => setEdit((e as CustomEvent).detail);
    window.addEventListener("edit", fn);
    return () => window.removeEventListener("edit", fn);
  }, []);
  return (
    <main style={{ maxWidth: 900, margin: "20px auto", padding: 12 }}>
      <button onClick={() => selection.selectAllMatching()}>Select all matching</button>
      <button onClick={() => setScope(scope === "one" ? "two" : "one")}>Change scope</button>
      <button onClick={() => setPage(page + 1)}>Another page</button>
      <button onClick={() => setMany(!many)}>Large dataset</button>
      <button onClick={() => setAutoLoad(true)}>Enable incremental loading</button>
      <output aria-label="Page requests">{loads}</output>
      <button onClick={() => setMode("loading")}>Simulate loading</button>
      <button onClick={() => setMode("error")}>Simulate error</button>
      <button onClick={() => document.documentElement.classList.toggle("dark")}>Theme</button>
      <output aria-label="Selection">{JSON.stringify(selection.selection)}</output>
      <output aria-label="Count">{selection.count}</output>
      <output aria-label="Edited">{edit}</output>
      <textarea aria-label="Native input" defaultValue="Native text" />
      <DataTable
        table={table}
        label="Fixture"
        height={400}
        status={mode}
        retry={() => setMode("ready")}
        queryKey={scope}
        loadMore={
          autoLoad
            ? { available: true, loading: false, load: () => setLoads((n) => n + 1) }
            : undefined
        }
      />
      <button onClick={() => setEdit(tableCsv(table))}>Export loaded rows</button>
    </main>
  );
}
const defaultsMode = new URLSearchParams(location.search).get(
  "defaults",
) as TableDefaultsMode | null;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.search.includes("fill=") ? (
      <TableFillLayoutFixture />
    ) : defaultsMode ? (
      <TableDefaultsFixture mode={defaultsMode} />
    ) : location.search.includes("details") ? (
      <DetailedFixture />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);

function DetailedFixture() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clicked, setClicked] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const [action, setAction] = useState(0);
  const rows = Array.from({ length: location.search.includes("fit") ? 2 : 200 }, (_, i) => ({
    id: `record-${i}`,
    title: i === 0 ? "Multiline content ".repeat(35) : `Record ${i}`,
  }));
  return (
    <main style={{ padding: 20, maxWidth: 850 }}>
      <output aria-label="Clicked row">{clicked}</output>
      <output aria-label="Row click count">{clickCount}</output>
      <output aria-label="Action count">{action}</output>
      <DataTable
        label="Detailed records"
        rows={rows}
        getRowId={(r) => r.id}
        height={location.search.includes("fit") ? "auto" : 450}
        rowHeight="auto"
        showColumnSettings={false}
        onRowClick={(r) => {
          setClicked(r.id);
          setClickCount((count) => count + 1);
        }}
        rowClassName={(r) => (r.id === "record-0" ? "bg-amber-100" : undefined)}
        renderRowDetail={(r) =>
          expanded === r.id ? (
            <DataTable
              label="Nested records"
              rows={[{ id: "child", title: "Child value" }]}
              getRowId={(r) => r.id}
              columns={[{ id: "title", accessorKey: "title", label: "Child title" }]}
              height={150}
              showColumnSettings={false}
            />
          ) : null
        }
        columns={[
          { id: "id", accessorKey: "id", label: "ID", size: 140, pin: "start", grow: false },
          { id: "title", accessorKey: "title", label: "Title", size: 250, grow: 1 },
          {
            id: "actions",
            label: "Actions",
            size: 130,
            enableCellSelection: false,
            cell: ({ row }) => (
              <>
                <button
                  onClick={() => {
                    setExpanded(expanded === row.id ? null : row.id);
                    setAction((n) => n + 1);
                  }}
                >
                  Details {row.id}
                </button>
                <details>
                  <summary>More {row.id}</summary>
                  <p>{"Extra details ".repeat(20)}</p>
                </details>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
