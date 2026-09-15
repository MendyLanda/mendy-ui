"use client";
import { useMemo, useState } from "react";
import { MendyUIProvider, defineFilters, filter, useFilters, useMendyLocale } from "@mendylanda/ui";
import { en } from "@mendylanda/ui/locales/en";
import { he } from "@mendylanda/ui/locales/he";
import {
  DataTable,
  defineColumns,
  TableActionBar,
  useDataTable,
  format,
} from "@mendylanda/ui/table";
import { Button } from "@mendylanda/ui/primitives/button";

type Project = { id: string; name: string; status: string; date: string; budget: number };
const rows: Project[] = Array.from({ length: 120 }, (_, i) => ({
  id: `P-${i + 1}`,
  name: `Project ${i + 1}`,
  status: i % 2 ? "active" : "planned",
  date: `2026-09-${String((i % 28) + 1).padStart(2, "0")}`,
  budget: 1234 + i,
}));

export function LocaleDemo() {
  const [hebrew, setHebrew] = useState(true);
  return (
    <div className="my-6 space-y-4" data-testid="locale-demo">
      <div className="flex gap-2" aria-label="Demo language" role="group">
        <Button variant="outline" size="sm" aria-pressed={!hebrew} onClick={() => setHebrew(false)}>
          English
        </Button>
        <Button
          variant="outline"
          size="sm"
          lang="he"
          aria-pressed={hebrew}
          onClick={() => setHebrew(true)}
        >
          עברית
        </Button>
      </div>
      <MendyUIProvider locale={hebrew ? he : en}>
        <LocalizedProjects />
      </MendyUIProvider>
    </div>
  );
}
function LocalizedProjects() {
  const { code } = useMendyLocale();
  const hebrew = code === "he-IL";
  // Application labels and data stay with the application. IDs stay stable across languages.
  const definitions = useMemo(
    () =>
      defineFilters({
        status: filter.select({
          label: hebrew ? "מצב" : "Status",
          searchable: false,
          options: [
            { value: "active", label: hebrew ? "פעיל" : "Active" },
            { value: "planned", label: hebrew ? "מתוכנן" : "Planned" },
          ],
          getValue: (option) => option.value,
          getLabel: (option) => option.label,
        }),
        project: filter.options({
          label: hebrew ? "פרויקט" : "Project",
          options: rows,
          getValue: (row) => row.id,
          getLabel: (row) => (hebrew ? `פרויקט ${row.id}` : row.name),
        }),
        date: filter.dateRange({ label: hebrew ? "תאריך" : "Date" }),
        budget: filter.numberRange({ label: hebrew ? "תקציב" : "Budget" }),
      }),
    [hebrew],
  );
  const filters = useFilters(definitions);
  const columns = useMemo(
    () =>
      defineColumns<Project>((column) => [
        column.accessor("id", {
          label: hebrew ? "מזהה" : "ID",
          pin: "start",
          size: 110,
          grow: false,
        }),
        column.accessor("name", {
          label: hebrew ? "פרויקט" : "Project",
          size: 230,
          render: ({ row }) => (hebrew ? `פרויקט ${row.id}` : row.name),
        }),
        column.accessor("status", {
          label: hebrew ? "מצב" : "Status",
          size: 180,
          render: ({ value }) =>
            value === "active" ? (hebrew ? "פעיל" : "Active") : hebrew ? "מתוכנן" : "Planned",
        }),
        column.accessor("budget", {
          label: hebrew ? "תקציב" : "Budget",
          size: 180,
          format: format.currency("ILS", code),
        }),
      ]),
    [code, hebrew],
  );
  const shown = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!filters.values.status || row.status === filters.values.status) &&
          (!filters.values.project || filters.values.project.includes(row.id)) &&
          (filters.values.budget?.[0] == null || row.budget >= filters.values.budget[0]) &&
          (filters.values.budget?.[1] == null || row.budget <= filters.values.budget[1]) &&
          (!filters.values.date?.from || row.date >= filters.values.date.from) &&
          (!filters.values.date?.to || row.date <= filters.values.date.to) &&
          (!filters.search ||
            `${row.id} ${hebrew ? "פרויקט" : row.name}`
              .toLocaleLowerCase(code)
              .includes(filters.search.toLocaleLowerCase(code))),
      ),
    [
      filters.values.status,
      filters.values.project,
      filters.values.budget,
      filters.values.date,
      filters.search,
      hebrew,
      code,
    ],
  );
  const table = useDataTable({
    rows: shown,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });
  return (
    <DataTable
      table={table}
      filters={filters}
      height={320}
      footer={
        <TableActionBar
          count={Object.keys(table.state.rowSelection).length}
          onClear={() => table.resetRowSelection()}
        >
          <span />
        </TableActionBar>
      }
    />
  );
}
