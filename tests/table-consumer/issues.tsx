import { useState } from "react";
import { MendyUIProvider } from "@mendylanda/ui";
import { he } from "@mendylanda/ui/locales/he";
import { en } from "@mendylanda/ui/locales/en";
import { DataTable, defineColumns, selectionColumn } from "@mendylanda/ui/table";

type RecordRow = { id: string; title: string; amount: number };
const records = [{ id: "payment:9bb760c3-internal", title: "תשלום עבור אוגוסט", amount: 120 }];
const columns = defineColumns<RecordRow>((c) => [
  selectionColumn<RecordRow>(),
  c.accessor("title", { label: "תיאור", size: 800 }),
  c.accessor("amount", { label: "סכום", size: 800 }),
  {
    ...c.display("actions", {
      label: "",
      render: () => <button>Edit</button>,
      pin: "end",
      size: 60,
    }),
    enableHiding: false,
  },
]);
export function TableIssuesFixture() {
  const params = new URLSearchParams(location.search);
  const [opened, setOpened] = useState(0);
  const mode = params.get("mode");
  return (
    <MendyUIProvider locale={params.get("dir") === "ltr" ? en : he}>
      <main style={{ padding: 12, maxWidth: 700 }}>
        <output data-opened="">{opened}</output>
        <DataTable
          rows={mode ? [] : records}
          columns={params.has("inline") ? columns.filter((c) => c.id !== "_selection") : columns}
          enableRowSelection={!params.has("disabled")}
          getRowLabel={params.has("label") ? (r) => `תשלום: ${r.title}` : undefined}
          getRowId={(r) => r.id}
          onRowClick={() => setOpened((n) => n + 1)}
          onRowActivate={() => setOpened((n) => n + 1)}
          status={mode === "error" ? "error" : "ready"}
          retry={() => {}}
          layout="fill"
        />
      </main>
    </MendyUIProvider>
  );
}
