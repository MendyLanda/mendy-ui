import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:8795" });

for (const dir of ["ltr", "rtl"]) {
  for (const wide of [false, true]) {
    test(`${dir} both pinned edges stay visible (${wide ? "wide" : "scrolling"})`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, "Desktop pinned geometry");
      await page.goto(`/?consumer&dir=${dir}${wide ? "&wide" : ""}`);
      const grid = page.getByRole("grid");
      for (const scroll of [0, 140, 1000]) {
        await grid.evaluate(
          (el, left) => {
            el.scrollLeft = left;
          },
          dir === "rtl" ? -scroll : scroll,
        );
        for (const id of ["id", "actions"]) {
          const cell = grid.locator(`[data-row-id="r-0"][data-column-id="${id}"]`);
          await expect(cell).toBeVisible();
          await expect
            .poll(async () =>
              cell.evaluate((el) => {
                const r = el.getBoundingClientRect();
                const g = el.closest('[role="grid"]')!.getBoundingClientRect();
                return r.left >= g.left - 1 && r.right <= g.right + 1;
              }),
            )
            .toBe(true);
        }
      }
    });
  }
}

test("below-fold fill keeps a usable viewport", async ({ page }) => {
  await page.goto("/?consumer&below&minimum");
  const grid = page.getByRole("grid");
  await expect.poll(async () => (await grid.boundingBox())!.height).toBeGreaterThanOrEqual(240);
  await grid.scrollIntoViewIfNeeded();
  const before = (await grid.boundingBox())!.height;
  await page.setViewportSize({ width: 900, height: 700 });
  await expect.poll(async () => (await grid.boundingBox())!.height).toBeGreaterThanOrEqual(240);
  expect(before).toBeGreaterThanOrEqual(240);
  const height = (await page.locator('[data-slot="data-table"]').boundingBox())!.height;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 920, height: 700 });
  await expect
    .poll(async () => (await page.locator('[data-slot="data-table"]').boundingBox())!.height)
    .toBeCloseTo(height, 0);
  await page.goto("/?consumer&below");
  await expect
    .poll(async () => (await page.locator('[data-slot="data-table"]').boundingBox())!.height)
    .toBeGreaterThanOrEqual(240);
});

test("RTL selection outlines follow the visual edges across pinned columns", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop keyboard selection");
  await page.goto("/?consumer&wide");
  const grid = page.getByRole("grid");
  const first = grid.locator('[data-row-id="r-0"][data-column-id="id"]');
  await first.click();
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Shift+ArrowLeft");
  const firstOutline = first.locator("[data-selection-outline]");
  const lastOutline = grid.locator(
    '[data-row-id="r-0"][data-column-id="count"] [data-selection-outline]',
  );
  await expect(firstOutline).toHaveCSS("border-right-width", "2px");
  await expect(firstOutline).toHaveCSS("border-left-width", "0px");
  await expect(lastOutline).toHaveCSS("border-left-width", "2px");
  await expect(lastOutline).toHaveCSS("border-right-width", "0px");
});

test("custom toolbar start shares a row with actions and settings and wraps on phones", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?consumer&toolbar&wide");
  const frame = page.locator('[data-slot="data-table"]');
  const search = frame.getByRole("searchbox");
  const action = frame.getByRole("button", { name: "Export" });
  const settings = frame.getByRole("button", { name: "הגדרות עמודות" });
  await expect(search).toBeVisible();
  await expect(action).toBeVisible();
  await expect(settings).toBeVisible();
  if (!isMobile)
    expect(
      Math.abs((await search.boundingBox())!.y - (await action.boundingBox())!.y),
    ).toBeLessThan(10);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
  const count = frame.locator('[data-row-id="r-0"][data-column-id="count"]');
  await expect(count).toHaveCSS("text-align", "start");
});

test("one-line headings have no scroll affordance; long headings remain reachable", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?consumer");
  await page.evaluate(() => document.fonts.load("500 16px Heebo"));
  await page.addStyleTag({
    content:
      '[data-slot="filter-menu-panel"] span[data-more-below] { font-family: Heebo; font-size: 16px; line-height: 20px; }',
  });
  await page.getByRole("button", { name: "פתיחת מסננים" }).click();
  await page.getByRole("button", { name: "מצב הפרויקט", exact: true }).click();
  const heading = page.locator('span[data-more-below][title="מצב הפרויקט"]');
  await expect(heading).toBeVisible();
  // Let font layout, ResizeObserver and React commit before asserting absence.
  await page.waitForTimeout(150);
  await expect(heading).not.toHaveAttribute("tabindex", "0");
  await expect(heading).toHaveAttribute("data-more-below", "false");
  await page.keyboard.press("Escape");
  if (isMobile) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Toggle long heading" }).click();
  await page.getByRole("button", { name: "פתיחת מסננים" }).click();
  await page.getByRole("button", { name: /^כותרת ארוכה/ }).click();
  const long = page.locator('span[data-more-below][title^="כותרת ארוכה"]');
  await expect(long).toHaveAttribute("tabindex", "0");
  await long.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(long).toHaveAttribute("data-more-below", "false");
});
