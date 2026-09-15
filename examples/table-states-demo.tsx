"use client";
import { useState } from "react";
import { DataTable, defineColumns } from "@mendylanda/ui/table";
import { Button } from "@mendylanda/ui/primitives/button";

type Project = { id: string; name: string; owner: string };
const rows: Project[] = [
  { id: "website", name: "Website", owner: "Alex Morgan" },
  { id: "mobile", name: "Mobile app", owner: "Jordan Lee" },
  { id: "docs", name: "Documentation", owner: "Casey Taylor" },
];
const columns = defineColumns<Project>((column) => [
  column.accessor("name", { label: "Project" }),
  column.accessor("owner", { label: "Owner" }),
]);
const states = ["Ready", "Loading", "Refreshing", "Empty", "Error"] as const;
export function TableStatesDemo() {
  const [state, setState] = useState<(typeof states)[number]>("Ready");
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Simulate query state" className="flex flex-wrap gap-2">
        {states.map((value) => (
          <Button
            key={value}
            size="sm"
            variant="outline"
            aria-pressed={state === value}
            onClick={() => setState(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <DataTable
        rows={state === "Empty" || state === "Loading" || state === "Error" ? [] : rows}
        columns={columns}
        getRowId={(row) => row.id}
        label="Query state example"
        height={240}
        showColumnSettings={false}
        status={state === "Loading" ? "loading" : state === "Error" ? "error" : "ready"}
        refreshing={state === "Refreshing"}
        error="Could not load projects."
        retry={() => setState("Ready")}
      />
    </div>
  );
}
