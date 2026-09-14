import type { BoundDefinitions, FilterChange } from "@mendylanda/ui/filters";
import type { DataTableInstance } from "@mendylanda/ui/table";
import type { ReactNode } from "react";
import { useState } from "react";
import { bindFilters, filter, useControlledFilters } from "@mendylanda/ui/filters";
import { DataTable, defineColumns, selectionColumn, useDataTable } from "@mendylanda/ui/table";

type Row = { id: string; title: string; group: "Even" | "Odd" };
type TableState = DataTableInstance<Row>["state"];
type ColumnFiltersState = TableState["columnFilters"];
type PaginationState = TableState["pagination"];
type SortingState = TableState["sorting"];
export type TableDefaultsMode =
  | "sizing"
  | "height"
  | "state"
  | "empty"
  | "filtered"
  | "later"
  | "custom"
  | "controller"
  | "controller-empty"
  | "locked";

const makeRows = (count: number): Row[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `default-${index}`,
    title: `Item ${String(index).padStart(3, "0")}`,
    group: index % 2 === 0 ? "Even" : "Odd",
  }));

const columns = defineColumns<Row>((column) => [
  selectionColumn<Row>(),
  column.accessor("title", { label: "Title", size: 220, grow: 1 }),
  column.accessor("group", { label: "Group", size: 120 }),
]);

declare global {
  interface Window {
    tableDefaults?: {
      append?: () => void;
      equivalentState?: () => void;
      sort?: () => void;
      filter?: () => void;
      globalFilter?: () => void;
      paginate?: () => void;
      changeQuery?: () => void;
      applyExternalFilter?: () => void;
    };
  }
}

export function TableDefaultsFixture({ mode }: { mode: TableDefaultsMode }) {
  if (mode === "sizing") return <SizingFixture />;
  if (mode === "state") return <StateFixture />;
  if (mode === "controller" || mode === "controller-empty" || mode === "locked")
    return <ControlledFiltersFixture mode={mode} />;
  if (mode === "empty" || mode === "filtered" || mode === "later" || mode === "custom")
    return <EmptyFixture mode={mode} />;
  return <HeightFixture />;
}

function HeightFixture() {
  const [count, setCount] = useState(3);
  const rows = makeRows(count);
  const table = useDataTable({
    rows,
    columns,
    getRowId: (row) => row.id,
    enableRowSelection: true,
  });

  return (
    <FixtureFrame>
      <button onClick={() => setCount(30)}>Append rows</button>
      <output aria-label="Height row count">{count}</output>
      <DataTable
        table={table}
        label="Default height table"
        showColumnSettings={false}
        isRowHighlighted={(row) => row.id === "default-1"}
      />
    </FixtureFrame>
  );
}

function StateFixture() {
  const [count, setCount] = useState(160);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [queryKey, setQueryKey] = useState("scope-one");
  const [revision, setRevision] = useState(0);
  const rows = makeRows(count);
  const table = useDataTable({
    rows,
    columns,
    getRowId: (row) => row.id,
    processing: { filtering: "client", sorting: "client", pagination: "client" },
    state: { sorting, columnFilters, globalFilter, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
  });

  window.tableDefaults = {
    append: () => {
      setCount((value) => value + 20);
      setRevision((value) => value + 1);
    },
    equivalentState: () => {
      setSorting((value) => [...value]);
      setColumnFilters((value) => value.map((filter) => ({ ...filter })));
      setPagination((value) => ({ ...value }));
      setRevision((value) => value + 1);
    },
    sort: () => {
      setSorting([{ id: "title", desc: true }]);
      setRevision((value) => value + 1);
    },
    filter: () => {
      setColumnFilters([{ id: "group", value: "Even" }]);
      setRevision((value) => value + 1);
    },
    globalFilter: () => {
      setGlobalFilter("Item");
      setRevision((value) => value + 1);
    },
    paginate: () => {
      setPagination((value) => ({ ...value, pageIndex: 1 }));
      setRevision((value) => value + 1);
    },
    changeQuery: () => {
      setQueryKey("scope-two");
      setRevision((value) => value + 1);
    },
  };

  return (
    <FixtureFrame>
      <output aria-label="State row count">{count}</output>
      <output aria-label="State revision">{revision}</output>
      <DataTable
        table={table}
        label="State reset table"
        showColumnSettings={false}
        queryKey={queryKey}
      />
    </FixtureFrame>
  );
}

function EmptyFixture({
  mode,
}: {
  mode: Extract<TableDefaultsMode, "empty" | "filtered" | "later" | "custom">;
}) {
  const filtered = mode === "filtered" || mode === "custom";
  const later = mode === "later";
  const rows = mode === "empty" ? [] : makeRows(3);
  const [globalFilter, setGlobalFilter] = useState(filtered ? "missing" : "");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: later ? 2 : 0,
    pageSize: 2,
  });
  const table = useDataTable({
    rows,
    columns,
    getRowId: (row) => row.id,
    processing: { filtering: "client", pagination: "client" },
    state: { globalFilter, pagination },
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
  });

  return (
    <FixtureFrame>
      <DataTable
        table={table}
        label="Empty state table"
        showColumnSettings={false}
        emptyState={mode === "custom" ? <span>Custom empty state</span> : undefined}
      />
    </FixtureFrame>
  );
}

type ExternalFilterState = {
  status: "active" | null;
  disabledTerm: string | null;
};

const external = bindFilters<ExternalFilterState>();
const controllerDefinitions: BoundDefinitions<ExternalFilterState> = {
  status: external.field(
    "status",
    filter.select({
      label: "Status",
      searchable: false,
      options: [{ value: "active", label: "Active" }],
    }),
  ),
};
const lockedDefinitions: BoundDefinitions<ExternalFilterState> = {
  requiredStatus: external.field(
    "status",
    filter.select({
      label: "Required status",
      removable: false,
      searchable: false,
      options: [{ value: "active", label: "Active" }],
    }),
  ),
  disabledTerm: external.field(
    "disabledTerm",
    filter.text({ label: "Disabled term", disabled: true }),
  ),
};

function ControlledFiltersFixture({
  mode,
}: {
  mode: Extract<TableDefaultsMode, "controller" | "controller-empty" | "locked">;
}) {
  const locked = mode === "locked";
  const [value, setValue] = useState<ExternalFilterState>({
    status: mode === "controller" ? null : "active",
    disabledTerm: locked ? "fixed" : null,
  });
  const [patchCount, setPatchCount] = useState(0);
  const [lastSource, setLastSource] = useState<FilterChange["source"] | "none">("none");
  const filters = useControlledFilters({
    definitions: locked ? lockedDefinitions : controllerDefinitions,
    value,
    onPatch: (patch, meta) => {
      setValue((current) => ({ ...current, ...patch }));
      setPatchCount((count) => count + 1);
      setLastSource(meta.source);
    },
  });
  const rows = mode === "controller-empty" && value.status ? [] : locked ? [] : makeRows(160);
  const table = useDataTable({
    rows,
    columns,
    getRowId: (row) => row.id,
  });

  window.tableDefaults = {
    applyExternalFilter: () => {
      filters.commit("status", "active");
    },
  };

  return (
    <FixtureFrame>
      <output aria-label="Filter patch count">{patchCount}</output>
      <output aria-label="Last filter source">{lastSource}</output>
      <DataTable
        table={table}
        label="Controlled filters table"
        showColumnSettings={false}
        filters={filters}
        filterBar={locked ? false : { showSearch: false }}
      />
    </FixtureFrame>
  );
}

function FixtureFrame({ children }: { children: ReactNode }) {
  return <main style={{ maxWidth: 900, margin: "20px auto", padding: 12 }}>{children}</main>;
}

function SizingFixture() {
  const wideColumns = defineColumns<Row>((column) => [
    column.accessor("title", { label: "Title", size: 1000 }),
    column.accessor("group", { label: "Group", size: 300 }),
  ]);
  return (
    <FixtureFrame>
      <DataTable
        rows={makeRows(1)}
        columns={wideColumns}
        getRowId={(row) => row.id}
        label="Wide short table"
        showColumnSettings={false}
      />
      <DataTable
        rows={[]}
        columns={columns}
        getRowId={(row) => row.id}
        label="Tall empty table"
        showColumnSettings={false}
        emptyState={
          <div
            style={{
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 24,
            }}
          >
            <strong>No records yet</strong>
            <p>Create your first record to get started.</p>
            <button>Create record</button>
          </div>
        }
      />
    </FixtureFrame>
  );
}
