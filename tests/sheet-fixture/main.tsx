import React, { StrictMode, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Sheet,
  SheetProvider,
  useSheet,
  useSheets,
  useSheetCloseGuard,
} from "@mendylanda/ui/sheet";
import { MendyUIProvider } from "@mendylanda/ui/filters";
import { he } from "@mendylanda/ui/locales/he";
import { Button } from "@mendylanda/ui/primitives/button";
import { Input } from "@mendylanda/ui/primitives/input";
import { Popover, PopoverContent, PopoverTrigger } from "@mendylanda/ui/primitives/popover";
import "@mendylanda/ui/styles.css";
import "./styles.css";
const params = new URLSearchParams(location.search);
const rtl = params.has("rtl");
if (params.has("dark")) document.documentElement.classList.add("dark");
const counts = new Map<string, number>();
function Editor({ id }: { id: string }) {
  counts.set(id, (counts.get(id) ?? 0) + 1);
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState("");
  const sheets = useSheets();
  const sheet = useSheet();
  useSheetCloseGuard(value !== saved);
  return (
    <Sheet.Content>
      <Sheet.Header title={`Project ${id}`} description="Project settings" />
      <Sheet.Body>
        <label>
          Name
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        </label>
        <p>
          Render count <output data-renders={id}>{counts.get(id)}</output>
        </p>
        <Button
          onClick={() =>
            sheets.open({ id: "child", width: 440, render: () => <Editor id="child" /> })
          }
        >
          Open related
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button>Choose category</Button>
          </PopoverTrigger>
          <PopoverContent>
            <button>Category A</button>
          </PopoverContent>
        </Popover>
        <Button onClick={() => sheets.close(id)}>Close by API</Button>
        <p>{sheet.pinned ? "Pinned" : "Floating"}</p>
        {params.has("long") && Array.from({ length: 100 }, (_, i) => <p key={i}>Detail {i}</p>)}
      </Sheet.Body>
      <Sheet.Footer>
        <Button onClick={() => setSaved(value)}>Save</Button>
      </Sheet.Footer>
    </Sheet.Content>
  );
}
declare global {
  interface Window {
    sheetStress: {
      open: (id: string) => void;
      close: (id: string) => void;
      pin: (id: string) => void;
      unpin: (id: string) => void;
      counts: () => Record<string, number>;
    };
  }
}
function StressEditor({ id }: { id: string }) {
  counts.set(id, (counts.get(id) ?? 0) + 1);
  const { pinned } = useSheet();
  useSheetCloseGuard(false);
  return (
    <Sheet.Content>
      <Sheet.Header title={`Stress ${id}`} />
      <Sheet.Body>
        <span>{pinned ? "Pinned" : "Floating"}</span>
        {Array.from({ length: 100 }, (_, index) => (
          <label key={index}>
            Field {index}
            <input defaultValue={`${id}:${index}`} />
          </label>
        ))}
      </Sheet.Body>
    </Sheet.Content>
  );
}
function StressControls() {
  const sheets = useSheets();
  useLayoutEffect(() => {
    window.sheetStress = {
      open: (id) => sheets.open({ id, render: () => <StressEditor id={id} /> }),
      close: (id) => sheets.close(id),
      pin: (id) => sheets.pin(id),
      unpin: (id) => sheets.unpin(id),
      counts: () => Object.fromEntries(counts),
    };
  }, [sheets]);
  return null;
}
function Page() {
  const sheets = useSheets();
  const [route, setRoute] = useState("first");
  const [controlled, setControlled] = useState(false);
  return (
    <main>
      <h1>Sheet checks</h1>
      <Button
        onClick={() =>
          sheets.open({
            id: "one",
            persist: { type: "project", payload: "one" },
            render: () => <Editor id="one" />,
          })
        }
      >
        Open project
      </Button>
      <Button onClick={() => sheets.open({ id: "two", render: () => <Editor id="two" /> })}>
        Open another
      </Button>
      <Button
        onClick={() =>
          sheets.open({
            id: "start",
            side: "start",
            width: 360,
            render: () => <Editor id="start" />,
          })
        }
      >
        Open start
      </Button>
      <Button onClick={() => setRoute(route === "first" ? "second" : "first")}>Navigate</Button>
      <p data-route="">{route}</p>
      {route === "first" && <div>Route-owned content</div>}
      <Sheet>
        <Sheet.Trigger asChild>
          <Button>Open uncontrolled</Button>
        </Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header title="Uncontrolled" />
          <Sheet.Body>Content</Sheet.Body>
        </Sheet.Content>
      </Sheet>
      <Sheet open={controlled} onOpenChange={setControlled}>
        <Sheet.Trigger asChild>
          <Button>Open controlled</Button>
        </Sheet.Trigger>
        <Sheet.Content>
          <Sheet.Header title="Controlled" />
          <Sheet.Body>Content</Sheet.Body>
        </Sheet.Content>
      </Sheet>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MendyUIProvider locale={rtl ? he : undefined}>
      <SheetProvider
        animation={!params.has("instant")}
        persistence={{
          key: "sheet-test",
          resolve: (record) => (record.type === "project" ? <Editor id={record.id} /> : null),
        }}
      >
        <Page />
        {params.has("stress") && <StressControls />}
      </SheetProvider>
    </MendyUIProvider>
  </StrictMode>,
);
