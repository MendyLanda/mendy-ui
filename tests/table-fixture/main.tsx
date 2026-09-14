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
  const [edit, setEdit] = useState("");
  const rows = mode === "ready" ? (many ? allRows : allRows.slice(page * 20, page * 20 + 20)) : [];
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
      />
      <button onClick={() => setEdit(tableCsv(table))}>Export loaded rows</button>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
