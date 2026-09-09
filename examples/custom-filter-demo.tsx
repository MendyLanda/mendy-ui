"use client";
import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AppliedFilter } from "@mendylanda/ui/filters";

export function CustomFilterDemo() {
  const [archived, setArchived] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-6">
      <AppliedFilter
        label="Visibility"
        editor={
          <div className="w-64 p-4">
            <Label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox
                className="rounded-sm"
                id={id}
                checked={archived}
                onCheckedChange={(checked) => setArchived(checked === true)}
                onKeyDown={(event) => {
                  if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
                }}
              />
              Include archived items
            </Label>
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
