"use client";
import { useState } from "react";
import { AppliedFilter } from "@mendylanda/ui/filters";
import { FilterTextEditor } from "@mendylanda/ui/filters";
import { parseFilterValues } from "@mendylanda/ui/filters";
import { Button } from "@/components/ui/button";

export function TextFilterDemo() {
  const [values, setValues] = useState(["design", "frontend"]);
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-6">
      {values.length ? (
        <AppliedFilter
          label="Tags"
          open={open}
          onOpenChange={setOpen}
          onRemove={() => setValues([])}
          editor={
            <FilterTextEditor
              label="Tags, separated by commas"
              defaultValue={values.join(", ")}
              validate={(draft) =>
                parseFilterValues(draft).length === 0 ? "Enter at least one tag." : undefined
              }
              onApply={(draft) => {
                setValues(parseFilterValues(draft));
                setOpen(false);
              }}
            />
          }
        >
          Tags <span className="text-foreground">{values.join(", ")}</span>
        </AppliedFilter>
      ) : (
        <Button variant="outline" onClick={() => setValues(["design", "frontend"])}>
          Add tags
        </Button>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        Applied: {values.length ? values.join(", ") : "none"}
      </p>
    </div>
  );
}
