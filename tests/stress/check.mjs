import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const results = [];
async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, ms: Date.now() - start });
  } catch (e) {
    results.push({ name, passed: false, error: String(e) });
  }
  console.log(results.at(-1));
}
async function fixture(query = "", width = 1280) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    isMobile: width < 640,
    hasTouch: width < 640,
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:8790/?" + query);
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  if (width < 640) await page.locator('[aria-label="Filter types"] > button').first().click();
  return { context, page };
}
await check(
  "1,000 filters: bounded initial rows, search, End/Home, scrolling, PageDown and empty recovery",
  async () => {
    const { context, page } = await fixture("fields=1000");
    const rows = page.locator('[aria-label="Filter types"] > button[aria-expanded]');
    await expect(rows).toHaveCount(100);
    const search = page.getByRole("searchbox", { name: "Find a filter" });
    await search.fill("Field 0994");
    await search.press("ArrowDown");
    await expect(page.getByRole("button", { name: "Field 0994", exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: "Field 0994", exact: true })).toBeFocused();
    await search.fill("unmatchedxyz");
    await expect(page.getByText("No matching filters.")).toBeVisible();
    await search.fill("");
    await search.press("ArrowDown");
    await page.keyboard.press("End");
    await expect(page.getByRole("button", { name: "Field 0994", exact: true })).toBeFocused();
    const scroll = await page
      .locator('[aria-label="Filter types"]')
      .evaluate((e) => ({ top: e.scrollTop, h: e.clientHeight, full: e.scrollHeight }));
    assert(scroll.top > 0 && scroll.h < 500 && scroll.full > scroll.h);
    await page.keyboard.press("Home");
    await expect(rows.first()).toBeFocused();
    await page.keyboard.press("PageDown");
    assert.equal(await rows.first().evaluate((e) => e === document.activeElement), false);
    await context.close();
  },
);
for (const width of [1280, 320])
  await check(
    `10,000 options at ${width}px: search distant selection, clear query, reveal more and retain focus`,
    async () => {
      const { context, page } = await fixture("options=10000", width);
      await expect(page.getByRole("menuitemcheckbox")).toHaveCount(100);
      const search = page.getByRole("searchbox", { name: "Search people" });
      await search.fill("Person 09999");
      const last = page.getByRole("menuitemcheckbox", { name: "Person 09999" });
      await last.click();
      await expect(last).toHaveAttribute("aria-checked", "true");
      await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toBeVisible();
      assert.deepEqual(JSON.parse(await page.locator("#values").textContent()).people, ["9999"]);
      await search.fill("");
      await expect(page.getByRole("menuitemcheckbox")).toHaveCount(100);
      await page.getByRole("button", { name: "Show more (9,900 remaining)" }).click();
      await expect(page.getByRole("menuitemcheckbox")).toHaveCount(200);
      await expect(page.getByRole("menuitemcheckbox").nth(100)).toBeFocused();
      await search.fill("Person 09999");
      await last.click();
      assert.equal(JSON.parse(await page.locator("#values").textContent()).people, null);
      await context.close();
    },
  );
for (const width of [1280, 320])
  await check(
    `Unbroken labels at ${width}px: scrollable editor, contained options, accessible removal`,
    async () => {
      const { context, page } = await fixture("long=1&active=1", width);
      assert(
        await page
          .getByRole("menuitemcheckbox")
          .first()
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      );
      const g = await page
        .getByRole("dialog", { name: "Filters", exact: true })
        .evaluate((e) => ({ h: e.clientHeight, s: e.scrollHeight }));
      assert(g.s <= g.h + 1);
      await page.getByRole("menuitemcheckbox", { name: "Person 00003" }).click();
      await page.keyboard.press("Escape");
      if (width < 640) await page.keyboard.press("Escape");
      const remove = page.getByRole("button", { name: /^Remove CustomerAccountReference/ });
      await expect(remove).toBeInViewport();
      await remove.click();
      await expect(remove).toHaveCount(0);
      await context.close();
    },
  );
await check("260px host container: search field stays inside host", async () => {
  const { context, page } = await fixture("container=260");
  assert(await page.locator("section").evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
  await context.close();
});
await check(
  "Remote rapid queries ignore late results, recover from errors, and paginate",
  async () => {
    const { context, page } = await fixture("remote=1");
    const search = page.getByRole("searchbox", { name: "Search people" });
    await search.fill("slow");
    await page.waitForTimeout(30);
    for (let i = 0; i < 20; i++) await search.fill(`q${i}`);
    await search.fill("fast");
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Remote fast", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(350);
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Remote slow", exact: true }),
    ).toHaveCount(0);
    await search.fill("error");
    await expect(page.getByText("Temporary failure")).toBeVisible();
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Remote error", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Load more", exact: true }).click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Remote errornext", exact: true }),
    ).toBeVisible();
    await context.close();
  },
);
await check("10,000 selected values: complete data, compact summary, removal", async () => {
  const { context, page } = await fixture("options=10000&active=10000", 320);
  assert.equal(JSON.parse(await page.locator("#values").textContent()).people.length, 10000);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const chip = page.locator('[data-slot="filter-chip"]');
  await expect(chip).toBeVisible();
  assert(await chip.evaluate((e) => e.getBoundingClientRect().width <= innerWidth));
  await page.getByRole("button", { name: "Remove Assignee filter", exact: true }).click();
  assert.equal(JSON.parse(await page.locator("#values").textContent()).people, null);
  await context.close();
});
await check("50,000 options: bounded DOM and full search", async () => {
  const { context, page } = await fixture("options=50000");
  await expect(page.getByRole("menuitemcheckbox")).toHaveCount(100);
  await page.getByRole("searchbox", { name: "Search people" }).fill("Person 49999");
  await page.getByRole("menuitemcheckbox", { name: "Person 49999" }).click();
  assert.deepEqual(JSON.parse(await page.locator("#values").textContent()).people, ["49999"]);
  await context.close();
});
await check("30 open/close cycles: no retained dialogs or runaway heap growth", async () => {
  const { context, page } = await fixture("fields=1000&options=10000");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.keyboard.press("Escape");
  await cdp.send("HeapProfiler.collectGarbage");
  const before = (await cdp.send("Performance.getMetrics")).metrics.find(
    (x) => x.name === "JSHeapUsedSize",
  ).value;
  const nodeCount = await page.locator("*").count();
  for (let i = 0; i < 30; i++) {
    await page.getByRole("button", { name: "Open filters", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search people" }).fill("Person 09999");
    await page.keyboard.press("Escape");
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  assert.equal(await page.locator("*").count(), nodeCount);
  await cdp.send("HeapProfiler.collectGarbage");
  const after = (await cdp.send("Performance.getMetrics")).metrics.find(
    (x) => x.name === "JSHeapUsedSize",
  ).value;
  results.push({ name: "Heap after GC", before, after, growth: after - before });
  assert(after - before < 8 * 1024 * 1024);
  await context.close();
});
await check("RTL mirrors search controls and isolates chip punctuation", async () => {
  const { context, page } = await fixture("rtl=1");
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  const input = page.getByRole("searchbox", { name: "Search", exact: true });
  const box = await trigger.boundingBox();
  const searchBox = await input.boundingBox();
  assert(box.x < searchBox.x + searchBox.width / 2);
  const label = page.locator('[data-slot="filter-suggestion"] span[title="Status"]');
  await expect(label).toHaveAttribute("dir", "auto");
  await expect(label).toHaveCSS("direction", "ltr");
  await context.close();
});
await check(
  "Oversized heading has a keyboard scroll target and a fade that ends at the bottom",
  async () => {
    const { context, page } = await fixture("long=1", 320);
    const heading = page.locator('[data-more-below="true"]');
    await expect(heading).toHaveAttribute("tabindex", "0");
    assert.notEqual(await heading.evaluate((e) => getComputedStyle(e).maskImage), "none");
    await heading.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    await expect(page.locator('[data-more-below="true"]')).toHaveCount(0);
    await context.close();
  },
);
await browser.close();
await writeFile(
  "artifacts/ui-polish/design-stress/behavior.json",
  JSON.stringify(results, null, 2),
);
if (results.some((r) => r.passed === false)) process.exitCode = 1;
