import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  bindFilters,
  defineFilters,
  filter,
  jsonCodec,
  valueIsActive,
} from "@mendylanda/ui/filters";
import {
  classifyPaste,
  decodeFilters,
  encodeFilters,
  validateDefinitions,
} from "@mendylanda/ui/filters";

test("URL codecs preserve defaults, explicit clearing, reserved strings, and unrelated params", () => {
  const definitions = defineFilters({
    status: filter.multiSelect({
      label: "Status",
      options: [{ value: "active", label: "Active" }],
      defaultValue: ["active"],
      clearValue: [],
    }),
    text: filter.text({ label: "Text" }),
    ids: filter.tokens({ label: "IDs" }),
  });
  for (const text of [null, "~null", "~~literal", "a,b & c / d", "שלום"]) {
    const values = { status: [], text, ids: ["001", "a,b", "x&y"] };
    const encoded = encodeFilters(definitions, values, new URLSearchParams("tab=details"));
    assert.equal(encoded.get("tab"), "details");
    assert.deepEqual(decodeFilters(definitions, encoded), values);
  }
  assert.deepEqual(decodeFilters(definitions, new URLSearchParams()).status, ["active"]);
  assert.deepEqual(
    decodeFilters(definitions, encodeFilters(definitions, { status: null })).status,
    null,
  );
});
test("malformed URLs fall back to defaults and do not become applied values", () => {
  const definitions = defineFilters({
    ids: filter.tokens({ label: "IDs" }),
    range: filter.numberRange({ label: "Range" }),
    date: filter.dateRange({ label: "Date" }),
  });
  assert.deepEqual(
    decodeFilters(
      definitions,
      new URLSearchParams({ ids: "[1]", range: "[10,2]", date: '{"from":"2026-02-31","to":null}' }),
    ),
    { ids: null, range: null, date: null },
  );
});
test("false and zero can be applied values", () => {
  assert.equal(valueIsActive(false), true);
  assert.equal(valueIsActive(0), true);
  assert.equal(valueIsActive([]), false);
});
test("URL names cannot collide with each other, search, or overflow", () => {
  assert.throws(() =>
    validateDefinitions({ x: filter.text({ label: "X", urlKey: "q" }) }, "q", "_filters"),
  );
  assert.throws(() =>
    validateDefinitions(
      {
        x: filter.text({ label: "X", urlKey: "shared" }),
        y: filter.text({ label: "Y", urlKey: "shared" }),
      },
      "q",
      "_filters",
    ),
  );
});
test("paste recognizes, normalizes, deduplicates, and merges without dropping unknown text", () => {
  const field = filter.tokens({
    label: "IDs",
    recognize: (token) => (/^id:\d+$/i.test(token) ? [token.slice(3)] : undefined),
  });
  const result = classifyPaste("id:001,ID:001\nid:002\tordinary words", [
    { id: "ids", field, value: ["000"] },
  ]);
  assert.deepEqual(result, {
    changes: { ids: ["000", "001", "002"] },
    unmatched: ["ordinary words"],
    ambiguous: [],
  });
});
test("ambiguous recognition waits for a choice unless priority resolves it", () => {
  const field = filter.tokens({ label: "IDs", recognize: (token) => [token] });
  const entries = [
    { id: "one", field, value: null },
    { id: "two", field, value: null },
  ];
  const result = classifyPaste("123", entries);
  assert.deepEqual(result.changes, {});
  assert.equal(result.ambiguous.length, 1);
  assert.deepEqual(
    classifyPaste("123", [entries[0]!, { ...entries[1]!, field: { ...field, pastePriority: 1 } }])
      .changes,
    { two: ["123"] },
  );
});
test("invalid recognized values and disabled filters remain searchable text", () => {
  const field = filter.tokens({
    label: "IDs",
    recognize: (token) => [token],
    validate: () => "Invalid",
  });
  assert.deepEqual(classifyPaste("123", [{ id: "ids", field, value: null }]).unmatched, ["123"]);
});
test("composite date updates and clearing patch both keys without leaking unrelated state", () => {
  type State = { from: string | null; to: string | null; other: string };
  const bound = bindFilters<State>().composite(["from", "to"], {
    field: filter.dateRange({ label: "Date" }),
    read: (state) => ({ from: state.from, to: state.to }),
    write: (value) => ({ from: value?.from ?? null, to: value?.to ?? null }),
  });
  const state = { from: "2026-01-01", to: "2026-02-01", other: "retain" };
  assert.deepEqual(bound.write(bound.clearValue, state), { from: null, to: null });
});
test("field updates can atomically enforce domain rules", () => {
  type State = { tags: string[] | null; hasTag: string | null };
  const bound = bindFilters<State>().field("hasTag", filter.text({ label: "Tagged" }), {
    update: (hasTag) => ({ hasTag, ...(hasTag === "without" ? { tags: null } : {}) }),
  });
  assert.deepEqual(bound.write("without", { tags: ["one"], hasTag: null }), {
    hasTag: "without",
    tags: null,
  });
});
test("custom codec round-trips typed domain values", () => {
  const field = filter.custom({
    label: "Flag",
    defaultValue: null as boolean | null,
    clearValue: null,
    codec: jsonCodec(
      (value): value is boolean | null => value === null || typeof value === "boolean",
    ),
  });
  assert.equal(field.codec.parse(field.codec.serialize(false)), false);
});

test("empty ranges normalize to unapplied values and static single choices reject unknown URL values", () => {
  const range = filter.numberRange({ label: "Range" });
  assert.equal(range.normalize([null, null]), null);
  assert.equal(range.isActive(range.normalize([null, null])), false);
  assert.deepEqual(range.normalize([0, null]), [0, null]);
  const date = filter.dateRange({ label: "Date" });
  assert.equal(date.normalize({ from: null, to: null }), null);
  const status = filter.select({ label: "Status", options: [{ value: "open", label: "Open" }] });
  assert.equal(status.codec.parse("invented"), null);
});
