import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  FilterBar,
  bindFilters,
  defineFilters,
  filter,
  useControlledFilters,
  useFilters,
  useFilterSearch,
} from "@mendylanda/ui/filters";
import { useUrlFilters } from "@mendylanda/ui/filters/nuqs";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { useBufferedFilters } from "../../packages/ui/src/filters/use-buffered-filters.js";
import type { FilterController } from "@mendylanda/ui/filters";

const definitions = defineFilters({});
let renderer: ReactTestRenderer;
let renders = 0;
let value = { search: "" };
let patches: Partial<typeof value>[] = [];
let buffered: FilterController;
let filterValue = { search: "", role: null as "admin"[] | null };
let filterPatches: Partial<typeof filterValue>[] = [];
let urlUpdates: string[] = [];
let originals: Record<string, PropertyDescriptor | undefined>;

beforeEach((context) => {
  if ("mock" in context) context.mock.timers.enable({ apis: ["setTimeout"] });
  renders = 0;
  value = { search: "" };
  patches = [];
  filterValue = { search: "", role: null };
  filterPatches = [];
  urlUpdates = [];
  originals = Object.fromEntries(
    ["IS_REACT_ACT_ENVIRONMENT", "document", "window", "location"].map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  const location = new URL("https://test.invalid/search");
  Object.assign(globalThis, {
    IS_REACT_ACT_ENVIRONMENT: true,
    document: new EventTarget(),
    location,
    window: Object.assign(new EventTarget(), { location }),
  });
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  for (const [key, descriptor] of Object.entries(originals)) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

function ControlledPage() {
  renders++;
  const filters = useControlledFilters({
    definitions,
    value,
    onPatch: (patch) => patches.push(patch),
    search: { read: (state) => state.search, write: (search) => ({ search: search.trim() }) },
  });
  return createElement(FilterBar, { filters });
}
function LocalPage() {
  renders++;
  return createElement(FilterBar, { filters: useFilters(definitions) });
}
const roleDefinitions = defineFilters({
  role: filter.multiSelect({ label: "Role", options: [{ value: "admin", label: "Admin" }] }),
});
const bound = { role: bindFilters<typeof filterValue>().field("role", roleDefinitions.role) };
function BufferedPage() {
  const controller = useControlledFilters({
    definitions: bound,
    value: filterValue,
    onPatch: (patch) => filterPatches.push(patch),
    search: { read: (state) => state.search, write: (search) => ({ search }) },
  });
  buffered = useBufferedFilters(controller, 300).filters;
  return createElement("input", {
    value: buffered.search,
    onChange: (event: { target: { value: string } }) => buffered.setSearch(event.target.value),
  });
}
function UrlPage() {
  renders++;
  const filters = useUrlFilters(definitions, { remember: false, scope: "search-test" });
  return createElement(FilterBar, { filters });
}
function input() {
  return renderer.root.findByType("input");
}
async function type(text: string) {
  for (const character of text) {
    await act(async () => {
      input().props.onChange({ target: { value: input().props.value + character } });
    });
  }
}

test("FilterBar retains Hebrew characters and spaces during delayed controlled updates", async (context) => {
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type("  קרית גת ");
  assert.equal(input().props.value, "  קרית גת ");
  assert.equal(patches.length, 0);
  await act(async () => context.mock.timers.tick(300));
  assert.deepEqual(patches, [{ search: "קרית גת" }]);
});

test("FilterBar keeps local list renders outside the typing update", async (context) => {
  await act(async () => {
    renderer = create(createElement(LocalPage));
  });
  const initialRenders = renders;
  await type("קרית גת");
  assert.equal(renders, initialRenders);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(renderer.root.findByType(FilterBar).props.filters.search, "קרית גת");
});

test("URL-backed searches apply once after the pause without rendering the parent per key", async (context) => {
  await act(async () => {
    renderer = create(
      createElement(NuqsTestingAdapter, {
        hasMemory: true,
        onUrlUpdate: (event) => urlUpdates.push(event.searchParams.get("q") ?? ""),
        children: createElement(UrlPage),
      }),
    );
  });
  const initialRenders = renders;
  await type("קרית גת");
  assert.equal(renders, initialRenders);
  assert.deepEqual(urlUpdates, []);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(renderer.root.findByType(FilterBar).props.filters.search, "קרית גת");
  await act(async () => context.mock.timers.tick(1));
  assert.deepEqual(urlUpdates, ["קרית גת"]);
});

test("an older trimmed acknowledgement preserves newer text and the remaining typing delay", async (context) => {
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type("  קרית ");
  await act(async () => context.mock.timers.tick(300));
  await type("גת ");
  await act(async () => context.mock.timers.tick(200));
  value = { search: "קרית" };
  await act(async () => renderer.update(createElement(ControlledPage)));
  assert.equal(input().props.value, "  קרית גת ");
  await act(async () => context.mock.timers.tick(100));
  assert.deepEqual(patches, [{ search: "קרית" }, { search: "קרית גת" }]);
  value = { search: "קרית גת" };
  await act(async () => renderer.update(createElement(ControlledPage)));
  assert.equal(input().props.value, "  קרית גת ");
});

test("new typing restarts the pause, while a fresh parent callback does not", async (context) => {
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type("קרית");
  await act(async () => context.mock.timers.tick(200));
  await type(" גת");
  await act(async () => context.mock.timers.tick(200));
  await act(async () => renderer.update(createElement(ControlledPage)));
  assert.equal(patches.length, 0);
  await act(async () => context.mock.timers.tick(100));
  assert.deepEqual(patches, [{ search: "קרית גת" }]);
});

test("Enter flushes immediately and composing Enter leaves the pending search alone", async (context) => {
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type("קרית גת");
  const event = {
    key: "Enter",
    shiftKey: false,
    nativeEvent: { isComposing: true },
    currentTarget: { value: input().props.value },
  };
  await act(async () => input().props.onKeyDown(event));
  assert.equal(patches.length, 0);
  await act(async () => input().props.onKeyDown({ ...event, nativeEvent: { isComposing: false } }));
  assert.deepEqual(patches, [{ search: "קרית גת" }]);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(patches.length, 1);
});

test("clearing the main search applies immediately and cancels pending typing", async (context) => {
  value.search = "ירושלים";
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type(" חדשה");
  await act(async () => input().props.onChange({ target: { value: "" } }));
  assert.equal(input().props.value, "");
  assert.deepEqual(patches, [{ search: "" }]);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(patches.length, 1);
});

test("external navigation replaces the draft and cancels its write", async (context) => {
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type("קרית גת");
  value.search = "ירושלים";
  await act(async () => renderer.update(createElement(ControlledPage)));
  assert.equal(input().props.value, "ירושלים");
  await act(async () => context.mock.timers.tick(300));
  assert.deepEqual(patches, []);
});

test("closing the filter bar cancels its pending search", async (context) => {
  await act(async () => {
    renderer = create(createElement(ControlledPage));
  });
  await type("קרית גת");
  await act(async () => renderer.unmount());
  await act(async () => context.mock.timers.tick(300));
  assert.deepEqual(patches, []);
});

test("selecting a field flushes the current draft in one immediate patch", async (context) => {
  await act(async () => {
    renderer = create(createElement(BufferedPage));
  });
  await type("  קרית גת ");
  await act(async () => {
    buffered.commit("role", ["admin"]);
  });
  assert.deepEqual(filterPatches, [{ role: ["admin"], search: "קרית גת" }]);
  filterValue = { ...filterValue, ...filterPatches[0] };
  await act(async () => renderer.update(createElement(BufferedPage)));
  assert.equal(input().props.value, "  קרית גת ");
  await act(async () => context.mock.timers.tick(300));
  assert.equal(filterPatches.length, 1);
});

test("clear all cancels a draft even before any search was applied", async (context) => {
  await act(async () => {
    renderer = create(createElement(BufferedPage));
  });
  await type("קרית גת");
  await act(async () => buffered.clear());
  assert.equal(input().props.value, "");
  assert.deepEqual(filterPatches, [{ role: null, search: "" }]);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(filterPatches.length, 1);
});

test("an external filter reset cancels a draft when the applied search stays empty", async (context) => {
  filterValue.role = ["admin"];
  await act(async () => {
    renderer = create(createElement(BufferedPage));
  });
  await type("קרית גת");
  filterValue.role = null;
  await act(async () => renderer.update(createElement(BufferedPage)));
  assert.equal(input().props.value, "");
  await act(async () => context.mock.timers.tick(300));
  assert.deepEqual(filterPatches, []);
});

test("paste appends to the displayed draft and applies once", async (context) => {
  await act(async () => {
    renderer = create(createElement(BufferedPage));
  });
  await type("קרית גת");
  await act(async () => {
    buffered.paste("next");
  });
  assert.equal(input().props.value, "קרית גת next");
  assert.deepEqual(filterPatches, [{ search: "קרית גת next" }]);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(filterPatches.length, 1);
});

test("a binding that updates related fields acknowledges its patch without discarding newer typing", async (context) => {
  let domainValue = {
    search: "",
    role: null as "admin"[] | null,
    detail: "existing" as string | null,
  };
  const domainPatches: Partial<typeof domainValue>[] = [];
  const project = bindFilters<typeof domainValue>();
  const domainDefinitions = {
    role: project.field("role", roleDefinitions.role, {
      update: (role) => ({ role, detail: null }),
    }),
    detail: project.field("detail", filter.text({ label: "Detail" })),
  };
  function DomainPage() {
    const controller = useControlledFilters({
      definitions: domainDefinitions,
      value: domainValue,
      onPatch: (patch) => domainPatches.push(patch),
      search: { read: (state) => state.search, write: (search) => ({ search }) },
    });
    buffered = useBufferedFilters(controller, 300).filters;
    return createElement("input", {
      value: buffered.search,
      onChange: (event: { target: { value: string } }) => buffered.setSearch(event.target.value),
    });
  }
  await act(async () => {
    renderer = create(createElement(DomainPage));
  });
  await type("  קרית ");
  await act(async () => {
    buffered.commit("role", ["admin"]);
  });
  await type("גת ");
  domainValue = { ...domainValue, ...domainPatches[0] };
  await act(async () => renderer.update(createElement(DomainPage)));
  assert.equal(input().props.value, "  קרית גת ");
  await act(async () => context.mock.timers.tick(300));
  assert.deepEqual(domainPatches, [
    { role: ["admin"], detail: null, search: "קרית" },
    { search: "קרית גת" },
  ]);
});

test("searchDebounceMs=0 supports existing adapters without another delay", async () => {
  function ImmediatePage() {
    return createElement(FilterBar, { filters: useFilters(definitions), searchDebounceMs: 0 });
  }
  await act(async () => {
    renderer = create(createElement(ImmediatePage));
  });
  await type("קרית גת");
  assert.equal(renderer.root.findByType(FilterBar).props.filters.search, "קרית גת");
});

test("search buffering preserves custom values through their codec", async (context) => {
  const fields = defineFilters({
    custom: filter.custom({
      label: "Custom",
      defaultValue: BigInt(1),
      clearValue: BigInt(0),
      codec: { parse: (raw) => BigInt(raw), serialize: (value) => value.toString() },
      isActive: () => false,
    }),
  });
  function CustomPage() {
    return createElement(FilterBar, { filters: useFilters(fields) });
  }
  await act(async () => {
    renderer = create(createElement(CustomPage));
  });
  await type("קרית גת");
  await act(async () => context.mock.timers.tick(300));
  assert.equal(renderer.root.findByType(FilterBar).props.filters.search, "קרית גת");
  assert.equal(renderer.root.findByType(FilterBar).props.filters.values.custom, BigInt(1));
});

test("standalone useFilterSearch preserves its nullable API and supports normalization and flush", async (context) => {
  let applied: (string | null)[] = [];
  function StandalonePage() {
    const search = useFilterSearch(value.search, (text) => applied.push(text), 300, {
      normalize: (text) => text.trim(),
    });
    return createElement("input", {
      value: search.value,
      onChange: (event: { target: { value: string } }) => search.setValue(event.target.value),
      onKeyDown: search.flush,
    });
  }
  await act(async () => {
    renderer = create(createElement(StandalonePage));
  });
  await type("  קרית גת ");
  await act(async () => input().props.onKeyDown());
  assert.deepEqual(applied, ["קרית גת"]);
  value.search = "קרית גת";
  await act(async () => renderer.update(createElement(StandalonePage)));
  assert.equal(input().props.value, "  קרית גת ");
  await act(async () => input().props.onChange({ target: { value: "" } }));
  assert.deepEqual(applied, ["קרית גת", null]);
  await act(async () => context.mock.timers.tick(300));
  assert.equal(applied.length, 2);
});
