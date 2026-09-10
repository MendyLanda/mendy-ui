import { chromium, firefox, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
const browserName = process.env.STRESS_BROWSER ?? "chromium";
const browserType = { chromium, firefox, webkit }[browserName];
if (!browserType) throw new Error(`Unknown stress browser: ${browserName}`);
const browser = await browserType.launch();
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
    isMobile: browserName === "firefox" ? undefined : width < 640,
    hasTouch: width < 640,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto("http://127.0.0.1:8790/?" + query);
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  if (width < 640)
    await page.locator('[aria-label="Filter types"] button[aria-expanded]').first().click();
  return { context, page };
}
await check(
  "Large collections stay bounded throughout opening, including the first measured frame",
  async () => {
    for (const query of ["fields=1000", "options=50000", "fields=1000&options=50000"]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:8790/?" + query);
      await page.evaluate(() => {
        window.peakRows = 0;
        new MutationObserver(() => {
          window.peakRows = Math.max(
            window.peakRows,
            document.querySelectorAll('[aria-label="Filter types"] button, [role^="menuitem"]')
              .length,
          );
        }).observe(document.body, { childList: true, subtree: true });
      });
      await page.getByRole("button", { name: "Open filters", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toBeVisible();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert((await page.evaluate(() => window.peakRows)) < 80, query);
      await context.close();
    }
  },
);
await check(
  "1,000 filters: bounded initial rows, search, End/Home, scrolling, PageDown and empty recovery",
  async () => {
    const { context, page } = await fixture("fields=1000");
    const rows = page.locator('[aria-label="Filter types"] button[aria-expanded]');
    assert((await rows.count()) < 50);
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
    assert(scroll.top > 0 && scroll.h <= 44 * 16 && scroll.full > scroll.h);
    await page.keyboard.press("Home");
    await expect(rows.first()).toBeFocused();
    await page.keyboard.press("PageDown");
    assert.notEqual(
      await page.evaluate(() => document.activeElement?.getAttribute("aria-label")),
      "Assignee",
    );
    await expect(page.locator('[aria-label="Filter types"] :focus')).toBeInViewport();
    await context.close();
  },
);
for (const width of [1280, 320])
  await check(
    `10,000 options at ${width}px: search distant selection, clear query, End/Home and bounded scrolling`,
    async () => {
      const { context, page } = await fixture("options=10000", width);
      assert((await page.getByRole("menuitemcheckbox").count()) < 50);
      const search = page.getByRole("searchbox", { name: "Search people" });
      await search.fill("Person 09999");
      const last = page.getByRole("menuitemcheckbox", { name: "Person 09999" });
      await last.click();
      await expect(last).toHaveAttribute("aria-checked", "true");
      await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toBeVisible();
      assert.deepEqual(JSON.parse(await page.locator("#values").textContent()).people, ["9999"]);
      await search.fill("");
      assert((await page.getByRole("menuitemcheckbox").count()) < 50);
      await search.press("ArrowDown");
      await page.keyboard.press("End");
      await expect(last).toBeFocused();
      await expect(last).toBeInViewport();
      await expect(last).toHaveAttribute("aria-checked", "true");
      assert((await page.getByRole("menuitemcheckbox").count()) < 50);
      await page.keyboard.press("Home");
      await expect(page.getByRole("menuitemcheckbox", { name: "Person 00000" })).toBeFocused();
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
  assert((await page.getByRole("menuitemcheckbox").count()) < 50);
  const search = page.getByRole("searchbox", { name: "Search people" });
  await search.press("ArrowDown");
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitemcheckbox", { name: "Person 49999" })).toBeFocused();
  await expect(page.getByRole("menuitemcheckbox", { name: "Person 49999" })).toBeInViewport();
  assert((await page.getByRole("menuitemcheckbox").count()) < 50);
  const list = page.locator('[data-filter-collection][aria-label="Assignee"]');
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  assert.deepEqual(
    accessibility.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => node.target),
    })),
    [],
  );
  for (const fraction of [0.25, 0.75, 0.5, 0.1]) {
    await list.evaluate((element, fraction) => {
      element.scrollTop = element.scrollHeight * fraction;
    }, fraction);
    await page.waitForTimeout(100);
    assert((await page.getByRole("menuitemcheckbox").count()) < 50);
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 49999" })).toBeFocused();
  }
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitemcheckbox", { name: "Person 49998" })).toBeFocused();
  await expect(page.getByRole("menuitemcheckbox", { name: "Person 49998" })).toBeInViewport();
  await page.getByRole("searchbox", { name: "Search people" }).fill("Person 49999");
  await page.getByRole("menuitemcheckbox", { name: "Person 49999" }).click();
  assert.deepEqual(JSON.parse(await page.locator("#values").textContent()).people, ["49999"]);
  await context.close();
});
await check(
  "1,000 filters on a phone: Back restores the distant row and scroll position",
  async () => {
    const { context, page } = await fixture("fields=1000", 320);
    await page.keyboard.press("Escape");
    const search = page.getByRole("searchbox", { name: "Find a filter" });
    await search.press("ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("textbox", { name: "Field 0994", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    const last = page.getByRole("button", { name: "Field 0994", exact: true });
    await expect(last).toBeFocused();
    await expect(last).toBeInViewport();
    assert((await page.locator('[aria-label="Filter types"] button[aria-expanded]').count()) < 50);
    await context.close();
  },
);
await check(
  "Virtual rows measure wrapped labels without overlapping, including enlarged text",
  async () => {
    const { context, page } = await fixture("options=10000&long=1&font=24", 320);
    const rows = page.getByRole("menuitemcheckbox");
    const first = await rows.first().boundingBox();
    const second = await rows.nth(1).boundingBox();
    assert(first.height > 60 && second.y >= first.y + first.height - 1);
    await page.getByRole("searchbox", { name: "Search people" }).press("ArrowDown");
    await page.keyboard.press("End");
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 09999" })).toBeFocused();
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 09999" })).toBeInViewport();
    await page.keyboard.press("Home");
    await expect(rows.first()).toBeFocused();
    await context.close();
  },
);
await check(
  "Changing collections preserve focus across virtualization, removal, disabling and empty results",
  async () => {
    const { context, page } = await fixture("options=1000&dynamic=1");
    const update = (detail) =>
      page.evaluate(
        (detail) => window.dispatchEvent(new CustomEvent("stress-options", { detail })),
        detail,
      );
    await update({ count: 50 });
    const current = page.getByRole("menuitemcheckbox", { name: "Person 00040" });
    await current.focus();
    await update({ count: 1000 });
    await expect(current).toBeFocused();
    await update({ count: 50 });
    await expect(current).toBeFocused();
    await update({ count: 50, remove: "40" });
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 00041" })).toBeFocused();
    await update({ count: 50, remove: "40", disable: "41" });
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 00042" })).toBeFocused();
    await update({ count: 0 });
    await expect(page.locator('[data-filter-collection][aria-label="Assignee"]')).toBeFocused();
    await update({ count: 1000 });
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 00000" })).toBeFocused();
    const search = page.getByRole("searchbox", { name: "Search people" });
    await search.fill("Person 00999");
    await update({ count: 20 });
    await expect(search).toBeFocused();
    await update({ count: 1000 });
    await expect(search).toBeFocused();
    await expect(page.getByRole("menuitemcheckbox", { name: "Person 00999" })).toBeVisible();
    await context.close();
  },
);
if (browserName === "chromium")
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
await check(
  "Anchored editors fit their content, follow lower rows and preserve mobile Back",
  async () => {
    for (const width of [1280, 390]) {
      const { context, page } = await fixture("fields=18&anchored", width);
      if (width === 390) await page.getByRole("button", { name: "Filters", exact: true }).click();
      const row = page.getByRole("button", { name: "Field 0012", exact: true });
      await row.click();
      const editor = page.locator('[data-slot="filter-menu-editor"]');
      const bounds = await editor.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
      if (width > 640) {
        const list = page.getByRole("group", { name: "Filter types", exact: true });
        assert(await list.evaluate((e) => e.scrollHeight <= e.clientHeight + 1));
        const rowBounds = await row.boundingBox();
        assert(bounds.y > 250 && bounds.y <= rowBounds.y + 4);
        assert(bounds.height < 300);
        assert(bounds.y + bounds.height <= 900 - 16);
        const listBounds = await page.locator('[data-slot="filter-menu-list"]').boundingBox();
        const searchBounds = await page
          .getByRole("searchbox", { name: "Search", exact: true })
          .boundingBox();
        assert(Math.abs(listBounds.width - searchBounds.width) <= 1);
        assert(Math.abs(listBounds.x + listBounds.width - bounds.x) <= 1);
        assert(bounds.y + bounds.height <= listBounds.y + listBounds.height + 1);
      } else {
        await page.getByRole("button", { name: "Filters", exact: true }).click();
        await expect(row).toBeFocused();
      }
      await context.close();
    }
  },
);
await check("Custom editor previews do not autofocus, activation does", async () => {
  const { context, page } = await fixture("custom&anchored");
  const field = page.getByRole("button", { name: "Title", exact: true });
  await field.hover();
  const row = page.getByRole("button", { name: "Assignee", exact: true });
  await row.hover();
  const input = page.getByRole("textbox", { name: "Custom search" });
  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await row.click();
  await expect(input).toBeFocused();
  await context.close();
});
await check("Hidden chip labels keep accessible names and custom summaries", async () => {
  const { context, page } = await fixture("active=2&chip-label");
  await page.keyboard.press("Escape");
  const chip = page.getByRole("button", { name: "Edit Assignee filter", exact: true });
  await expect(chip.locator('span[title="Assignee"]')).toHaveCount(0);
  await expect(chip.locator("[data-color-summary]")).toHaveCSS("color", "rgb(22, 163, 74)");
  await chip.click();
  await expect(page.getByRole("searchbox", { name: "Search people" })).toBeFocused();
  await context.close();
});
await browser.close();
const output = process.env.STRESS_OUTPUT ?? "artifacts/ui-polish/design-stress";
await mkdir(output, { recursive: true });
await writeFile(`${output}/behavior-${browserName}.json`, JSON.stringify(results, null, 2));
if (results.some((r) => r.passed === false)) process.exitCode = 1;
