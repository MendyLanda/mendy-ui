import { defineColumns, format } from "@mendylanda/ui/table";
type Item = { id: string; amount: number; owner?: { name: string } };
defineColumns<Item>((column) => [
  column.accessor("owner.name", { label: "Owner", render: ({ value }) => value?.toUpperCase() }),
  column.accessor("amount", { label: "Amount", format: format.currency("USD") }),
  // @ts-expect-error Unknown paths must not silently become empty columns.
  column.accessor("owner.missing", { label: "Missing" }),
  // @ts-expect-error The value type must match the formatter.
  column.accessor("id", { label: "ID", format: format.currency("USD") }),
  // @ts-expect-error Copy callbacks receive the inferred numeric value.
  column.accessor("amount", { label: "Amount", copy: (value) => value.toUpperCase() }),
]);

// Readonly query results are accepted without copying the dataset.
const readonlyOptions = {
  rows: [{ id: "read-only", amount: 1 }] as const,
  columns: defineColumns<Item>((column) => [column.accessor("amount", { label: "Amount" })]),
  getRowId: (row: Item) => row.id,
} satisfies import("@mendylanda/ui/table").UseDataTableOptions<Item>;
void readonlyOptions;
