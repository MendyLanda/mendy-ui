import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutSheets } from "../../packages/ui/src/sheet/layout";
import type { SheetEntry } from "../../packages/ui/src/sheet/layout";
import { createSheetStore } from "../../packages/ui/src/sheet/store";
import { readSheetRecords } from "../../packages/ui/src/sheet/persistence";
const sheet = (id: string, order: number, overrides: Partial<SheetEntry> = {}): SheetEntry => ({
  id,
  order,
  pinned: false,
  pinOrder: 0,
  width: 500,
  side: "end",
  pinnable: true,
  ...overrides,
});
test("sheets tile newest first, cover only when they cannot fit, and reserve pinned space", () => {
  const entries = [sheet("one", 1), sheet("two", 2)];
  let result = layoutSheets(entries, 1200);
  assert.equal(result.sheets.get("two")!.offset, 0);
  assert.equal(result.sheets.get("one")!.offset, 500);
  assert.equal(result.sheets.get("one")!.covered, false);
  result = layoutSheets(entries, 800);
  assert.equal(result.sheets.get("one")!.covered, true);
  assert.equal(result.sheets.get("two")!.modal, true);
  result = layoutSheets([sheet("one", 1, { pinned: true, pinOrder: 1 }), sheet("two", 2)], 1000);
  assert.equal(result.endWidth, 500);
  assert.equal(result.sheets.get("two")!.offset, 500);
  assert.equal(result.sheets.get("two")!.canPin, false);
});
test("mobile and overcommitted rails preserve pin intent without placing content offscreen", () => {
  const entries = [sheet("one", 1, { pinned: true }), sheet("two", 2, { pinned: true })];
  for (const width of [390, 768, 1000]) {
    const layout = layoutSheets(entries, width);
    assert.equal(layout.endWidth, 0);
    assert.equal(layout.sheets.get("two")!.offset, 0);
    assert.ok(layout.sheets.get("two")!.width <= width);
  }
  assert.equal(layoutSheets(entries, 1600).endWidth, 1000);
});
test("start and end rails reserve independently and empty layouts leave the page interactive", () => {
  const result = layoutSheets(
    [
      sheet("start", 1, { side: "start", pinned: true, pinOrder: 1 }),
      sheet("end", 2, { pinned: true, pinOrder: 2 }),
    ],
    1600,
  );
  assert.equal(result.startWidth, 500);
  assert.equal(result.endWidth, 500);
  assert.equal(result.hasOverlay, false);
  assert.equal(layoutSheets([], 1200).hasOverlay, false);
});
test("stack no-op updates preserve snapshots and close/pin requests use registered handlers", () => {
  const store = createSheetStore();
  const calls: string[] = [];
  store.setViewport(1400);
  const cleanup = store.register("one", {
    reopen: () => {},
    close: (reason) => calls.push(reason),
    pin: (value) => calls.push(`pin:${value}`),
    focus: () => calls.push("focus"),
  });
  const config = { side: "end" as const, width: 500, pinned: false, pinnable: true };
  store.update("one", config);
  const initial = store.getSheet("one");
  store.update("one", config);
  assert.equal(store.getSheet("one"), initial);
  store.setViewport(1401);
  assert.equal(store.getSheet("one"), initial);
  store.closeTop("escape");
  store.pinTop();
  assert.deepEqual(calls, ["escape", "pin:true"]);
  cleanup();
  assert.equal(store.getSheet("one"), undefined);
});
test("restoration validates records, deduplicates ids and rejects unknown storage versions", () => {
  assert.deepEqual(readSheetRecords(null), []);
  assert.deepEqual(
    readSheetRecords(JSON.stringify({ version: 2, sheets: [{ id: "one", type: "project" }] })),
    [],
  );
  assert.deepEqual(
    readSheetRecords(
      JSON.stringify({
        version: 1,
        sheets: [
          { id: "one", type: "project", payload: 42 },
          null,
          { id: "one", type: "project" },
          { type: "project" },
        ],
      }),
    ),
    [{ id: "one", type: "project", payload: 42 }],
  );
});

test("server rendering sheets does not access browser storage or document", async () => {
  const { createElement } = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { Sheet, SheetProvider } = await import("../../packages/ui/src/sheet/index");
  const html = renderToString(
    createElement(SheetProvider, {
      persistence: {
        key: "ssr",
        resolve: () => {
          throw new Error("Must not restore during SSR");
        },
      },
      children: createElement(Sheet, {
        defaultOpen: true,
        children: createElement(Sheet.Content, {
          children: createElement(Sheet.Header, { title: "Project" }),
        }),
      }),
    }),
  );
  assert.ok(html.includes("data-mendy-sheet-page"));
});

test("resize storms with unchanged geometry do not notify subscribers", () => {
  const store = createSheetStore();
  store.setViewport(1600);
  for (let i = 0; i < 100; i++) {
    store.update(String(i), { side: "end", width: 520, pinned: false, pinnable: true });
  }
  let notifications = 0;
  store.subscribe(() => notifications++);
  const snapshot = store.getLayout();
  for (let i = 0; i < 1000; i++) store.setViewport(1600 + i);
  assert.equal(notifications, 0);
  assert.equal(store.getLayout(), snapshot);
});

test("lazy sheet resolution preserves the requested opening sequence", () => {
  const store = createSheetStore();
  store.setViewport(800);
  const config = { side: "end" as const, width: 500, pinned: false, pinnable: true };
  store.update("newer", { ...config, requestedOrder: 2 });
  store.update("older", { ...config, requestedOrder: 1 });
  assert.equal(store.getSheet("newer")?.top, true);
  assert.equal(store.getSheet("older")?.covered, true);
  store.update("older", { ...config, requestedOrder: 3 });
  assert.equal(store.getSheet("older")?.top, true);
});
