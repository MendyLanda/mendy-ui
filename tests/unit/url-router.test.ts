import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultParseSearch } from "@tanstack/react-router";
import { defineFilters, filter, decodeFilters, encodeFilters } from "@mendylanda/ui/filters";
import { filterUrlParser } from "../../packages/ui/src/filters/url-parser";
const definitions = defineFilters({
  text: filter.text({ label: "Text" }),
  cities: filter.options({ label: "Cities", options: [], defaultValue: ["Default"] }),
  range: filter.numberRange({ label: "Range" }),
});
function adapterParams(query: string) {
  return new URLSearchParams(
    Object.entries(defaultParseSearch(query)).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((item) => [key, String(item)])
        : [
            [
              key,
              typeof value === "object" && value !== null ? JSON.stringify(value) : String(value),
            ],
          ],
    ),
  );
}
test("URL transport survives a JSON-first router without changing codec values", () => {
  for (const text of [
    "שלום",
    "123",
    "null",
    "true",
    '"quoted"',
    '["literal"]',
    '{"a":1}',
    "~ui:hello",
    "~~literal",
    "~null",
  ]) {
    for (const cities of [null, [], ["אופקים"], ["001", "123", "true", "null", "a,b"]]) {
      const values = { text, cities, range: [0, 20] };
      const params = encodeFilters(definitions, values);
      assert.deepEqual(decodeFilters(definitions, adapterParams(`?${params}`)), values);
    }
  }
});
test("legacy JSON and adapter-expanded arrays remain readable", () => {
  const params = adapterParams(
    "?cities=" +
      encodeURIComponent('["אופקים","ירושלים"]') +
      "&range=" +
      encodeURIComponent("[0,20]"),
  );
  const canonical = new URLSearchParams();
  for (const [key, field] of Object.entries(definitions)) {
    const value = filterUrlParser(field).parse(params.getAll(key));
    if (value !== null) canonical.set(key, value);
  }
  assert.deepEqual(decodeFilters(definitions, canonical), {
    text: null,
    cities: ["אופקים", "ירושלים"],
    range: [0, 20],
  });
  assert.deepEqual(
    decodeFilters(definitions, new URLSearchParams({ cities: '["old link"]' })).cities,
    ["old link"],
  );
});
test("invalid scalar values are not reinterpreted as array-shaped text", () => {
  assert.equal(filterUrlParser(definitions.text).parse([""]), null);
  assert.equal(filterUrlParser(definitions.text).parse(["   "]), null);
  assert.equal(filterUrlParser(definitions.text).parse(["one", "two"]), null);
});
