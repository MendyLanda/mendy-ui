"use client";
import { useMemo, useState } from "react";
import {
  DataTable,
  defineColumns,
  format,
  selectionColumn,
  TableActionBar,
  useDataTable,
} from "@mendylanda/ui/table";
import { Button } from "@mendylanda/ui/primitives/button";

type Project = {
  id: string;
  name: string;
  owner: { name: string };
  budget: number;
  updatedAt: Date;
};
const columns = defineColumns<Project>((column) => [
  selectionColumn<Project>(),
  column.accessor("name", { label: "Project", pin: "start", size: 250 }),
  column.accessor("owner.name", { label: "Owner" }),
  column.accessor("budget", { label: "Budget", format: format.currency("USD") }),
  column.accessor("updatedAt", {
    label: "Updated",
    format: format.date({ dateStyle: "medium" }, "en-US"),
  }),
]);
export function TableDemo() {
  const [large, setLarge] = useState(false);
  const rows = useMemo(
    () =>
      Array.from({ length: large ? 10000 : 80 }, (_, index) => ({
        id: `project-${index}`,
        name: `Project ${index + 1}`,
        owner: { name: ["Alex Morgan", "Jordan Lee", "Casey Taylor"][index % 3] },
        budget: 1200 + index * 37,
        updatedAt: new Date(2026, 0, (index % 28) + 1),
      })),
    [large],
  );
  const table = useDataTable({
    rows,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    preferences: { key: "projects", scope: "docs-demo" },
  });
  return (
    <DataTable
      table={table}
      label="Projects"
      height={420}
      toolbar={
        <Button size="sm" variant="outline" onClick={() => setLarge(!large)}>
          {large ? "Show 80 rows" : "Try 10,000 rows"}
        </Button>
      }
      footer={
        <TableActionBar
          count={Object.keys(table.state.rowSelection).length}
          onClear={() => table.resetRowSelection(true)}
        >
          <span className="text-sm text-muted-foreground">
            Select cells and press ⌘C or Ctrl+C to copy.
          </span>
        </TableActionBar>
      }
    />
  );
}
