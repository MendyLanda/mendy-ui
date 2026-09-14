import { useEffect, useRef, useState } from "react";
import {
  DataTable,
  TableView,
  defineColumns,
  selectionColumn,
  useDataTable,
} from "@mendylanda/ui/table";

type Row = { id: string; title: string; group: "Even" | "Odd" };
type Layout = "content" | "fill";
type Mode = "empty" | "error" | "large" | "loading" | "short";

const allRows: Row[] = Array.from({ length: 500 }, (_, index) => ({
  id: `fill-${index}`,
  title: `Fill row ${String(index).padStart(3, "0")}`,
  group: index % 2 === 0 ? "Even" : "Odd",
}));

let titleCellRenders = 0;

const columns = defineColumns<Row>((column) => [
  selectionColumn<Row>(),
  column.accessor("title", {
    label: "Title",
    size: 260,
    grow: 1,
    render: ({ value }) => {
      titleCellRenders += 1;
      return value;
    },
  }),
  column.accessor("group", { label: "Group", size: 140 }),
]);

declare global {
  interface Window {
    fillLayoutFixture?: {
      expandFooter: (height: number) => void;
      expandToolbar: (height: number) => void;
      insertAbove: (height: number) => void;
      setAboveHeight: (height: number) => void;
      setLayout: (layout: Layout) => void;
      setMode: (mode: Mode) => void;
      setMounted: (mounted: boolean) => void;
      titleCellRenders: () => number;
    };
  }
}

export function TableFillLayoutFixture() {
  const parameters = new URLSearchParams(location.search);
  const [layout, setLayout] = useState<Layout>(
    parameters.get("layout") === "content" ? "content" : "fill",
  );
  const [mode, setMode] = useState<Mode>(readMode(parameters.get("mode")));
  const [mounted, setMounted] = useState(true);
  const shell = useRef<HTMLDivElement>(null);
  const above = useRef<HTMLElement>(null);
  const tableFrame = useRef<HTMLElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLDivElement>(null);
  const height =
    parameters.get("height") === "260"
      ? 260
      : parameters.get("height") === "100%"
        ? "100%"
        : "auto";
  const directView = parameters.get("fill") === "view";

  useEffect(() => {
    if (parameters.get("theme") === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    window.fillLayoutFixture = {
      expandFooter: (value) => {
        if (footer.current) footer.current.style.height = `${value}px`;
      },
      expandToolbar: (value) => {
        if (toolbar.current) toolbar.current.style.height = `${value}px`;
      },
      insertAbove: (value) => {
        shell.current?.querySelector("[data-inserted-above]")?.remove();
        const node = document.createElement("aside");
        node.dataset.insertedAbove = "";
        node.dataset.testid = "inserted-above";
        node.style.height = `${value}px`;
        node.textContent = "Inserted announcement";
        if (shell.current && tableFrame.current)
          shell.current.insertBefore(node, tableFrame.current);
      },
      setAboveHeight: (value) => {
        if (above.current) above.current.style.height = `${value}px`;
      },
      setLayout,
      setMode,
      setMounted,
      titleCellRenders: () => titleCellRenders,
    };
    return () => {
      delete window.fillLayoutFixture;
    };
  }, []);

  return (
    <div
      ref={shell}
      data-testid="fill-shell"
      style={{
        boxSizing: "border-box",
        padding: "0 11px 19px",
        borderBottom: "4px solid transparent",
      }}
    >
      <style>{`
        html { color-scheme: light; background: #fff; --background: #fff; --foreground: #0a0a0a; --border: #e5e5e5; --input: #e5e5e5; --muted: #f5f5f5; --muted-foreground: #737373; --accent: #f5f5f5; --accent-foreground: #171717; }
        html.dark { color-scheme: dark; background: #0a0a0a; --background: #0a0a0a; --foreground: #fafafa; --border: #262626; --input: #404040; --muted: #262626; --muted-foreground: #a3a3a3; --accent: #262626; --accent-foreground: #fafafa; }
        body { background: var(--background); color: var(--foreground); }
      `}</style>
      <header
        ref={above}
        data-testid="above-content"
        style={{ height: 48, overflow: "hidden", padding: "8px 0", boxSizing: "border-box" }}
      >
        <strong>Fill layout fixture</strong>
        <output aria-label="Fixture mode">{mode}</output>
      </header>
      <section ref={tableFrame} data-testid="table-frame">
        {mounted && (
          <FixtureTable
            directView={directView}
            footerRef={footer}
            height={height}
            layout={layout}
            mode={mode}
            toolbarRef={toolbar}
          />
        )}
      </section>
    </div>
  );
}

function FixtureTable({
  directView,
  footerRef,
  height,
  layout,
  mode,
  toolbarRef,
}: {
  directView: boolean;
  footerRef: React.RefObject<HTMLDivElement | null>;
  height: number | "100%" | "auto";
  layout: Layout;
  mode: Mode;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
}) {
  const rows = mode === "large" ? allRows : mode === "short" ? allRows.slice(0, 2) : [];
  const status = mode === "error" ? "error" : mode === "loading" ? "loading" : "ready";
  const table = useDataTable({
    rows,
    columns,
    getRowId: (row) => row.id,
    processing: { pagination: "client" },
    initialState: { pagination: { pageIndex: 0, pageSize: 100 } },
  });
  const shared = {
    table,
    label: directView ? "Fill TableView" : "Fill DataTable",
    layout,
    height,
    status,
    error: "Fixture failed",
  } as const;
  const footer = (
    <div
      ref={footerRef}
      data-testid="fill-footer"
      style={{ height: 28, overflow: "hidden", boxSizing: "border-box" }}
    >
      Fixture footer
    </div>
  );

  if (directView) return <TableView {...shared} footer={footer} />;
  return (
    <DataTable
      {...shared}
      toolbar={
        <div
          ref={toolbarRef}
          data-testid="fill-toolbar"
          style={{ height: 28, overflow: "hidden", boxSizing: "border-box" }}
        >
          Fixture toolbar
        </div>
      }
      footer={footer}
      showColumnSettings
      showPagination
    />
  );
}

function readMode(value: string | null): Mode {
  if (value === "empty" || value === "error" || value === "loading" || value === "short")
    return value;
  return "large";
}
