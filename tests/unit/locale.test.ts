import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocale, defineLocale } from "../../packages/ui/src/locale";
import { en, englishMessages } from "../../packages/ui/src/locales/en";
import { he } from "../../packages/ui/src/locales/he";
import { filter } from "../../packages/ui/src/filters/filter-definition";
import { calendarLocale } from "../../packages/ui/src/calendar-locale";

test("Hebrew covers every message and preserves interpolation parameters", () => {
  assert.deepEqual(Object.keys(he.messages).sort(), Object.keys(englishMessages).sort());
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(englishMessages) as (keyof typeof englishMessages)[]) {
    assert.ok(he.messages[key].trim(), key);
    assert.deepEqual(placeholders(he.messages[key]), placeholders(englishMessages[key]), key);
  }
});
test("private dictionaries fall back to English and safely interpolate data", () => {
  const fr = defineLocale({ code: "fr-FR", direction: "ltr", messages: { search: "Rechercher" } });
  const locale = createLocale(fr);
  assert.equal(locale.t("search"), "Rechercher");
  assert.equal(locale.t("clearAll"), en.messages.clearAll);
  assert.equal(
    locale.t("selectedCount", { count: 1234 }),
    `${new Intl.NumberFormat("fr-FR").format(1234)} selected`,
  );
  assert.equal(
    locale.t("editFilter", { label: "{count} <script>" }),
    "Edit {count} <script> filter",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(fr)), fr);
});
test("built-in range validation localizes without changing values or custom errors", () => {
  const range = filter.numberRange({ label: "Budget" });
  assert.equal(range.validate([10, 1]), en.messages.numberRangeError);
  assert.equal(range.validate([10, 1], he.messages), he.messages.numberRangeError);
  assert.equal(range.validate([1, 10], he.messages), undefined);
  const date = filter.dateRange({ label: "Date" });
  assert.equal(
    date.validate({ from: "2026-10-01", to: "2026-09-01" }, he.messages),
    he.messages.dateRangeError,
  );
  const custom = filter.numberRange({ label: "Budget", validate: () => "App-owned message" });
  assert.equal(custom.validate([10, 1], he.messages), "App-owned message");
});
test("calendar uses Hebrew dates and labels with Gregorian storage semantics", () => {
  const locale = createLocale(he);
  const calendar = calendarLocale(locale, "UTC");
  const date = new Date("2026-09-15T12:00:00Z");
  assert.equal(calendar.formatters.formatCaption!(date), "ספטמבר 2026");
  assert.equal(calendar.labels.labelNext!(undefined), he.messages.nextMonth);
  assert.match(
    calendar.labels.labelDayButton!(date, { today: true, selected: true }),
    /היום.*2026.*נבחר/,
  );
  assert.equal(locale.t("searchField", { label: "פרויקטים" }), "חיפוש פרויקטים");
});

test("nullable external query errors mean success, not a translated failure", async () => {
  const { createElement } = await import("react");
  const { renderToString } = await import("react-dom/server");
  const { useFilterOptions } = await import("../../packages/ui/src/filters/use-filter-options");
  const { externalOptions } = await import("../../packages/ui/src/filters/filter-definition");
  const definition = filter.options({
    label: "People",
    options: externalOptions({ items: [{ value: "one", label: "One" }], error: null }),
  });
  function Probe() {
    const options = useFilterOptions("people", definition, null, true);
    return options.error ?? "ok";
  }
  assert.equal(renderToString(createElement(Probe)), "ok");
});
