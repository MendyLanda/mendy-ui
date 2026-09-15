import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable } from "../../packages/ui/src/table/data-table";

test("server rendering includes a bounded initial data window", () => {
  const html = renderToStaticMarkup(
    createElement(DataTable<{ id: string }>, {
      rows: Array.from({ length: 10000 }, (_, i) => ({ id: `server-${i}` })),
      columns: [{ id: "id", accessorKey: "id", label: "ID" }],
      getRowId: (row) => row.id,
      showColumnSettings: false,
    }),
  );
  assert.ok(html.includes('data-row-id="server-0"'));
  assert.ok(!html.includes('data-row-id="server-9999"'));
  assert.ok((html.match(/data-row-id=/g)?.length ?? 0) <= 40);
});
