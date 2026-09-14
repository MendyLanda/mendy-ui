import type { Locator, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

test.use({ baseURL: process.env.TABLE_FILL_BASE_URL ?? "http://127.0.0.1:8795" });

type FillFixtureAction = keyof NonNullable<Window["fillLayoutFixture"]>;

async function invokeFixture(page: Page, action: FillFixtureAction, value?: unknown) {
  await page.evaluate(
    ({ action, value }) => {
      const fixture = window.fillLayoutFixture;
      if (!fixture) throw new Error("Fill layout fixture is unavailable");
      const method = fixture[action] as (argument?: unknown) => unknown;
      method(value);
    },
    { action, value },
  );
}

async function fillMetrics(root: Locator) {
  return root.evaluate((element) => {
    let bottomInset = 0;
    let ancestor = element.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      bottomInset += Number.parseFloat(style.paddingBottom) || 0;
      bottomInset += Number.parseFloat(style.borderBottomWidth) || 0;
      ancestor = ancestor.parentElement;
    }
    const box = element.getBoundingClientRect();
    return {
      bottom: box.bottom,
      bottomInset,
      height: box.height,
      top: box.top,
      viewportHeight: window.innerHeight,
    };
  });
}

async function expectFillsViewport(root: Locator) {
  await expect
    .poll(async () => {
      const metrics = await fillMetrics(root);
      return Math.abs(metrics.bottom - (metrics.viewportHeight - metrics.bottomInset));
    })
    .toBeLessThanOrEqual(1);
}

async function visibleTitleRowId(grid: Locator) {
  return grid.locator('[data-column-id="title"]').evaluateAll((cells) => {
    const viewport = cells[0]?.closest('[role="grid"]')?.getBoundingClientRect();
    if (!viewport) return null;
    const cell = cells.find((candidate) => {
      const box = candidate.getBoundingClientRect();
      return box.top >= viewport.top + 44 && box.bottom <= viewport.bottom;
    });
    return cell?.getAttribute("data-row-id") ?? null;
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} DataTable fills the desktop and mobile viewport while reserving its controls`, async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) await page.setViewportSize({ width: 1100, height: 820 });
    await page.goto(`/?fill=data&theme=${theme}&mode=large`);

    const root = page.locator('[data-slot="data-table"]');
    const grid = page.getByRole("grid", { name: "Fill DataTable", exact: true });
    await expect(root).toHaveAttribute("data-layout", "fill");
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
    await expect
      .poll(() => grid.evaluate((element) => getComputedStyle(element).backgroundColor))
      .toBe(theme === "dark" ? "rgb(10, 10, 10)" : "rgb(255, 255, 255)");
    await expectFillsViewport(root);

    const [rootBox, toolbarBox, gridBox, paginationBox, footerBox] = await Promise.all([
      root.boundingBox(),
      page.getByTestId("fill-toolbar").boundingBox(),
      grid.boundingBox(),
      page.getByRole("navigation", { name: "Table pagination" }).boundingBox(),
      page.getByTestId("fill-footer").boundingBox(),
    ]);
    expect(gridBox!.height).toBeGreaterThan(isMobile ? 200 : 400);
    expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(gridBox!.y);
    expect(gridBox!.y + gridBox!.height).toBeLessThanOrEqual(paginationBox!.y);
    expect(paginationBox!.y + paginationBox!.height).toBeLessThanOrEqual(footerBox!.y);
    expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(rootBox!.y + rootBox!.height + 1);
    expect(await grid.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
      true,
    );
    expect(await grid.getByRole("row").count()).toBeLessThan(50);
  });
}

test("fill remains stable across row and feedback states and changing toolbar and footer heights", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto("/?fill=data&mode=short");
  const root = page.locator('[data-slot="data-table"]');
  const grid = page.getByRole("grid", { name: "Fill DataTable", exact: true });
  await expectFillsViewport(root);
  const initialRootHeight = (await root.boundingBox())!.height;
  const initialGridHeight = (await grid.boundingBox())!.height;

  await invokeFixture(page, "setMode", "empty");
  await expect(page.getByLabel("Fixture mode")).toHaveText("empty");
  await expect(grid.getByText("No rows yet.", { exact: true })).toBeVisible();
  await expectFillsViewport(root);

  await invokeFixture(page, "setMode", "error");
  await expect(page.getByLabel("Fixture mode")).toHaveText("error");
  await expect(grid.getByRole("alert")).toContainText("Fixture failed");
  await expectFillsViewport(root);

  await invokeFixture(page, "setMode", "loading");
  await expect(page.getByLabel("Fixture mode")).toHaveText("loading");
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await expectFillsViewport(root);

  await invokeFixture(page, "setMode", "large");
  await expect(page.getByLabel("Fixture mode")).toHaveText("large");
  await expect(grid).toHaveAttribute("aria-rowcount", "101");
  await expectFillsViewport(root);

  await invokeFixture(page, "expandToolbar", 76);
  await expect
    .poll(async () => initialGridHeight - (await grid.boundingBox())!.height)
    .toBeGreaterThan(40);
  const toolbarGridHeight = (await grid.boundingBox())!.height;
  await invokeFixture(page, "expandFooter", 64);
  await expect
    .poll(async () => toolbarGridHeight - (await grid.boundingBox())!.height)
    .toBeGreaterThan(34);
  expect((await root.boundingBox())!.height).toBeCloseTo(initialRootHeight, 0);
  await expectFillsViewport(root);
});

test("ancestor and inserted sibling resizing preserves scroll and selection without rerendering cells", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto("/?fill=data&mode=large");
  const root = page.locator('[data-slot="data-table"]');
  const grid = page.getByRole("grid", { name: "Fill DataTable", exact: true });
  await expectFillsViewport(root);

  await grid.evaluate((element) => {
    element.scrollTop = 1000;
  });
  await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
  await expect.poll(() => visibleTitleRowId(grid)).not.toBeNull();
  const rowId = await visibleTitleRowId(grid);
  const selectedCell = grid.locator(`[data-row-id="${rowId}"][data-column-id="title"]`);
  await selectedCell.click();
  await grid.getByRole("checkbox", { name: `Select row ${rowId}`, exact: true }).click();
  await expect(selectedCell).toHaveAttribute("aria-selected", "true");
  await expect(
    grid.getByRole("checkbox", { name: `Select row ${rowId}`, exact: true }),
  ).toHaveAttribute("aria-checked", "true");

  await page.waitForTimeout(100);
  const rendersBefore = await page.evaluate(() => window.fillLayoutFixture!.titleCellRenders());
  expect(rendersBefore).toBeGreaterThan(0);
  const before = await fillMetrics(root);
  const scrollBefore = await grid.evaluate((element) => element.scrollTop);
  await invokeFixture(page, "setAboveHeight", 96);
  await expect.poll(async () => (await fillMetrics(root)).top).toBeCloseTo(before.top + 48, 0);
  await expectFillsViewport(root);
  expect(await grid.evaluate((element) => element.scrollTop)).toBeCloseTo(scrollBefore, 0);
  await expect(selectedCell).toHaveAttribute("aria-selected", "true");

  const afterResize = await fillMetrics(root);
  await invokeFixture(page, "insertAbove", 37);
  await expect(page.getByTestId("inserted-above")).toBeVisible();
  await expect.poll(async () => (await fillMetrics(root)).top).toBeCloseTo(afterResize.top + 37, 0);
  await expectFillsViewport(root);
  expect(await grid.evaluate((element) => element.scrollTop)).toBeCloseTo(scrollBefore, 0);
  await expect(selectedCell).toHaveAttribute("aria-selected", "true");
  await expect(
    grid.getByRole("checkbox", { name: `Select row ${rowId}`, exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.fillLayoutFixture!.titleCellRenders())).toBe(
    rendersBefore,
  );
});

test("content and explicit heights stay content-sized when the page and preceding content resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto("/?fill=data&layout=content&height=260&mode=large");
  const root = page.locator('[data-slot="data-table"]');
  const grid = page.getByRole("grid", { name: "Fill DataTable", exact: true });
  await expect(root).toHaveAttribute("data-layout", "content");
  expect((await grid.boundingBox())!.height).toBeCloseTo(260, 0);
  await invokeFixture(page, "setAboveHeight", 96);
  await page.setViewportSize({ width: 1100, height: 700 });
  expect((await grid.boundingBox())!.height).toBeCloseTo(260, 0);
  await expect(root).not.toHaveAttribute("style", /height/);

  await invokeFixture(page, "setLayout", "fill");
  await expect(root).toHaveAttribute("data-layout", "fill");
  await expectFillsViewport(root);
  await invokeFixture(page, "setLayout", "content");
  await expect(root).toHaveAttribute("data-layout", "content");
  expect((await grid.boundingBox())!.height).toBeCloseTo(260, 0);
  await expect(root).not.toHaveAttribute("style", /height/);

  await page.goto("/?fill=data&layout=content&height=auto&mode=short");
  const shortGrid = page.getByRole("grid", { name: "Fill DataTable", exact: true });
  expect((await shortGrid.boundingBox())!.height).toBeLessThan(180);
  expect(await shortGrid.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(
    0,
  );

  await page.goto("/?fill=view&layout=fill&height=100%&mode=large");
  const viewRoot = page.locator('[data-slot="table-view"]');
  await expectFillsViewport(viewRoot);
  await invokeFixture(page, "setLayout", "content");
  await expect(viewRoot).toHaveAttribute("data-layout", "content");
  await expect(viewRoot).toHaveAttribute("style", /height:\s*100%/);
});

test("TableView includes its footer in fill height and measures again after remount", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 820 });
  await page.goto("/?fill=view&mode=large&theme=dark");
  const root = page.locator('[data-slot="table-view"]');
  const grid = page.getByRole("grid", { name: "Fill TableView", exact: true });
  const footer = page.getByTestId("fill-footer");
  await expectFillsViewport(root);
  const initialGridHeight = (await grid.boundingBox())!.height;
  const [initialRootBox, initialFooterBox] = await Promise.all([
    root.boundingBox(),
    footer.boundingBox(),
  ]);
  expect(initialFooterBox!.y + initialFooterBox!.height).toBeCloseTo(
    initialRootBox!.y + initialRootBox!.height,
    0,
  );

  await invokeFixture(page, "expandFooter", 84);
  await expect
    .poll(async () => (await grid.boundingBox())!.height)
    .toBeLessThanOrEqual(initialGridHeight - 55);
  await expectFillsViewport(root);

  await invokeFixture(page, "setMounted", false);
  await expect(root).toHaveCount(0);
  await invokeFixture(page, "setAboveHeight", 92);
  await invokeFixture(page, "setMounted", true);
  await expect(root).toBeVisible();
  await expectFillsViewport(root);
  const [remountedRootBox, remountedFooterBox] = await Promise.all([
    root.boundingBox(),
    footer.boundingBox(),
  ]);
  expect(remountedFooterBox!.y + remountedFooterBox!.height).toBeCloseTo(
    remountedRootBox!.y + remountedRootBox!.height,
    0,
  );
});
