import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TableView, defineColumns, useDataTable, selectedCellsText } from "@mendylanda/ui/table";
import "@mendylanda/ui/styles.css";

const params = new URLSearchParams(location.search);
const count = Number(params.get("rows") ?? 10000);
const columnCount = Number(params.get("columns") ?? 100);
type Item = { id: string; value: number };
const rows = Array.from({ length: count }, (_, value) => ({ id: String(value), value }));
const metrics = { renders: 0 };
Object.assign(window, { metrics });
function App() {
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(rows);
  // Deliberately inline: changing captured values must never leave stale cells.
  const columns = defineColumns<Item>((c) =>
    Array.from({ length: columnCount }, (_, i) => ({
      ...c.computed(`column-${i}`, (row) => row.value + i, {
        label: `Column ${i}`,
        size: 160,
        grow: false,
        pin: i === 0 ? "start" : i === columnCount - 1 ? "end" : undefined,
        render: ({ row }) => {
          metrics.renders++;
          if (i === 2 && params.has("editor"))
            return <input aria-label={`Edit ${row.id}`} defaultValue={row.value} />;
          return `${row.value + i}:${revision}`;
        },
      }),
      enableCellSelection: !(
        (params.has("disableFirstSelection") && i === 0) ||
        (params.has("disableLastSelection") && i === columnCount - 1)
      ),
    })),
  );
  const table = useDataTable({ rows: [...data], columns, getRowId: (row) => row.id });
  React.useLayoutEffect(() => {
    Object.assign(window, { table, copySelection: () => selectedCellsText(table) });
  });
  return (
    <main>
      <button onClick={() => setRevision((value) => value + 1)}>Update parent</button>
      <button
        onClick={() =>
          setData((items) =>
            items.map((row, index) => (index === 0 ? { ...row, value: 999 } : row)),
          )
        }
      >
        Update first row
      </button>
      <output>{revision}</output>
      <TableView
        table={table}
        height={600}
        isRowHighlighted={params.has("highlight") ? (row) => row.id === "0" : undefined}
        loadMore={
          params.has("loading") ? { available: true, loading: true, load: () => {} } : undefined
        }
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
