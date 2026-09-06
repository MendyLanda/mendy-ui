"use client";
import { useId, useState } from "react";
import { AppliedFilter } from "@/registry/new-york/filters";

export function CustomFilterDemo() {
  const [archived, setArchived] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-6">
      <AppliedFilter
        label="Visibility"
        editor={
          <div className="w-64 p-4">
            <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                id={id}
                type="checkbox"
                checked={archived}
                onChange={(event) => setArchived(event.target.checked)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
                }}
                className="size-4 accent-emerald-700"
              />
              Include archived items
            </label>
          </div>
        }
      >
        Visibility <span className="text-foreground">{archived ? "All items" : "Active only"}</span>
      </AppliedFilter>
      <p className="text-xs text-muted-foreground">
        Required filter. Editable, without a remove button.
      </p>
    </div>
  );
}
