"use client";
import { useState } from "react";
import { Sheet, SheetProvider, useSheets, useSheetCloseGuard } from "@mendylanda/ui/sheet";
import { Button } from "@mendylanda/ui/primitives/button";
import { Input } from "@mendylanda/ui/primitives/input";

export function SheetDemo() {
  return (
    <SheetProvider>
      <ProjectButtons />
    </SheetProvider>
  );
}
function ProjectButtons() {
  const sheets = useSheets();
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border p-5">
      <Button
        onClick={() =>
          sheets.open({ id: "website", render: () => <ProjectEditor name="Website" /> })
        }
      >
        Open project
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          sheets.open({ id: "mobile", render: () => <ProjectEditor name="Mobile app" /> })
        }
      >
        Open another project
      </Button>
    </div>
  );
}
function ProjectEditor({ name }: { name: string }) {
  const [title, setTitle] = useState(name);
  const [saved, setSaved] = useState(name);
  const sheets = useSheets();
  useSheetCloseGuard(title !== saved);
  return (
    <Sheet.Content>
      <Sheet.Header
        title={name}
        description="Edit the name, pin this sheet, or open a related record."
      />
      <Sheet.Body className="space-y-5">
        <label className="grid gap-2 text-sm">
          Project name
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <Button
          variant="outline"
          onClick={() =>
            sheets.open({
              id: "related",
              width: 420,
              render: () => <ProjectEditor name="Related project" />,
            })
          }
        >
          Open related project
        </Button>
      </Sheet.Body>
      <Sheet.Footer>
        <Sheet.Close asChild>
          <Button variant="outline">Cancel</Button>
        </Sheet.Close>
        <Button onClick={() => setSaved(title)}>Save changes</Button>
      </Sheet.Footer>
    </Sheet.Content>
  );
}
