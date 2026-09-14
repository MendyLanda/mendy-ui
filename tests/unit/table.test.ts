import assert from "node:assert/strict";
import { test } from "node:test";
import { defineColumns, format } from "../../packages/ui/src/table/columns";
import { reconcilePreferences, csvValue, tsvValue } from "../../packages/ui/src/table/state";

type Item = { id: string; amount: number; owner?: { name: string } };
const columns = defineColumns<Item>((column) => [
  column.accessor("id", { label: "ID" }),
  column.accessor("amount", {
    label: "Amount",
    format: format.currency("USD", "en-US"),
    minSize: 60,
    maxSize: 400,
  }),
  column.accessor("owner.name", { label: "Owner" }),
]);
test("preferences discard stale columns, clamp sizes and reconcile pins", () => {
  const result = reconcilePreferences(
    {
      version: 1,
      columnOrder: ["gone", "amount", "amount"],
      columnVisibility: { gone: false, id: false },
      columnSizing: { amount: 9999, id: NaN },
      columnPinning: { start: ["id", "gone"], end: ["id", "amount"] },
    },
    columns,
  );
  assert.deepEqual(result.columnOrder, ["amount", "id", "owner.name"]);
  assert.equal(result.columnSizing.amount, 400);
  assert.deepEqual(result.columnPinning, { start: ["id"], end: ["amount"] });
  assert.deepEqual(result.columnVisibility, { id: false });
});
test("nested accessors handle missing records and format meaningful copy values", () => {
  assert.equal(columns[2].copyValue?.({ id: "a", amount: 10 }), "");
  assert.equal(columns[1].copyValue?.({ id: "a", amount: 10 }), "$10.00");
});
test("CSV quotes delimiters and prevents formula execution; TSV preserves multi-line cells", () => {
  assert.equal(csvValue("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvValue('a,"b"'), '"a,""b"""');
  assert.equal(tsvValue("a\nb"), '"a\nb"');
});
