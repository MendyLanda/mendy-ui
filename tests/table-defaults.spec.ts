import type { Locator } from "@playwright/test";
import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:8795" });

async function selectVisibleTitleCell(grid: Locator) {
  const visibleRowId = () =>
    grid.locator('[data-column-id="title"]').evaluateAll((cells) => {
      const table = cells[0]?.closest('[role="grid"]');
      if (!table) return null;
      const viewport = table.getBoundingClientRect();
      const cell = cells.find((candidate) => {
        const box = candidate.getBoundingClientRect();
        return box.top >= viewport.top + 44 && box.bottom <= viewport.bottom;
      });
      return cell?.getAttribute("data-row-id") ?? null;
    });
  await expect.poll(visibleRowId).not.toBeNull();
  const rowId = await visibleRowId();
  await grid.locator(`[data-row-id="${rowId}"][data-column-id="title"]`).click();
}

test("default height fits content, grows to its cap, and selected rows join custom highlights", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/?defaults=height");
  const grid = page.getByRole("grid", { name: "Default height table", exact: true });
  const initialHeight = (await grid.boundingBox())!.height;
  expect(initialHeight).toBeLessThan(300);
  expect(await grid.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0);

  const selectedRow = grid.locator('[role="row"][data-index="0"]');
  const customRow = grid.locator('[role="row"][data-index="1"]');
  await expect(customRow).toHaveAttribute("data-highlighted", "true");
  await grid.getByRole("checkbox", { name: "Select row Item 000", exact: true }).click();
  await expect(selectedRow).toHaveAttribute("data-highlighted", "true");
  await expect(customRow).toHaveAttribute("data-highlighted", "true");
  const selectedBackground = await selectedRow
    .locator('[role="gridcell"]')
    .first()
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(selectedBackground).not.toBe("rgba(0, 0, 0, 0)");
  await grid.getByRole("checkbox", { name: "Select row Item 000", exact: true }).click();
  await expect(selectedRow).not.toHaveAttribute("data-highlighted", "true");

  await page.getByRole("button", { name: "Append rows", exact: true }).click();
  await expect(page.getByLabel("Height row count", { exact: true })).toHaveText("30");
  await expect.poll(async () => (await grid.boundingBox())!.height).toBeGreaterThan(initialHeight);
  expect((await grid.boundingBox())!.height).toBeLessThanOrEqual(586);
});

test("appended data and structurally equal state retain interaction while query state resets it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/?defaults=state");
  const grid = page.getByRole("grid", { name: "State reset table", exact: true });

  const selectScrolledCell = async () => {
    await grid.evaluate((element) => {
      element.scrollTop = 1000;
    });
    await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
    await selectVisibleTitleCell(grid);
    await expect(grid.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1);
  };
  const expectReset = async () => {
    await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(0);
    await expect(grid.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(0);
  };
  const invoke = async (name: keyof NonNullable<Window["tableDefaults"]>, revision: number) => {
    await page.evaluate((action) => window.tableDefaults?.[action]?.(), name);
    await expect(page.getByLabel("State revision", { exact: true })).toHaveText(String(revision));
  };

  await selectScrolledCell();
  const beforeAppend = await grid.evaluate((element) => element.scrollTop);
  await invoke("append", 1);
  await expect(page.getByLabel("State row count", { exact: true })).toHaveText("180");
  expect(await grid.evaluate((element) => element.scrollTop)).toBeGreaterThanOrEqual(
    beforeAppend - 1,
  );
  await expect(grid.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1);

  await invoke("equivalentState", 2);
  expect(await grid.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
  await expect(grid.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1);

  await invoke("sort", 3);
  await expectReset();
  await selectScrolledCell();
  await invoke("filter", 4);
  await expectReset();
  await selectScrolledCell();
  await invoke("globalFilter", 5);
  await expectReset();
  await selectScrolledCell();
  await invoke("paginate", 6);
  await expectReset();
  await selectScrolledCell();
  await invoke("changeQuery", 7);
  await expectReset();
});

test("empty states explain base, filtered, and later-page results and recover", async ({
  page,
}) => {
  await page.goto("/?defaults=empty");
  await expect(page.getByText("No rows yet.", { exact: true })).toBeVisible();

  await page.goto("/?defaults=filtered");
  await expect(page.getByText("No results match your filters.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.locator('[data-row-id="default-0"][data-column-id="title"]')).toBeVisible();

  await page.goto("/?defaults=later");
  await expect(page.getByText("No results on this page.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Go to first page", exact: true }).click();
  await expect(page.locator('[data-row-id="default-0"][data-column-id="title"]')).toBeVisible();
});

test("an explicit empty state overrides inferred recovery feedback", async ({ page }) => {
  await page.goto("/?defaults=custom");
  await expect(page.getByText("Custom empty state", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toHaveCount(0);
  await expect(page.getByText("No results match your filters.", { exact: true })).toHaveCount(0);
});

test("a controlled filter bar renders before the grid and controller changes reset interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto("/?defaults=controller");
  const addFilter = page.getByRole("button", { name: "Add filter", exact: true });
  const grid = page.getByRole("grid", { name: "Controlled filters table", exact: true });

  await expect(addFilter).toBeVisible();
  const [filterBox, gridBox] = await Promise.all([addFilter.boundingBox(), grid.boundingBox()]);
  expect(filterBox!.y + filterBox!.height).toBeLessThanOrEqual(gridBox!.y);

  await grid.evaluate((element) => {
    element.scrollTop = 1000;
  });
  await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBeGreaterThan(500);
  await selectVisibleTitleCell(grid);
  await expect(grid.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1);

  await page.evaluate(() => window.tableDefaults?.applyExternalFilter?.());
  await expect(page.getByLabel("Filter patch count", { exact: true })).toHaveText("1");
  await expect.poll(() => grid.evaluate((element) => element.scrollTop)).toBe(0);
  await expect(grid.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(0);
});

test("controlled empty recovery emits one clear patch", async ({ page }) => {
  await page.goto("/?defaults=controller-empty");
  await expect(page.getByText("No results match your filters.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByLabel("Filter patch count", { exact: true })).toHaveText("1");
  await expect(page.getByLabel("Last filter source", { exact: true })).toHaveText("clear");
  await expect(page.locator('[data-row-id="default-0"][data-column-id="title"]')).toBeVisible();
});

test("active disabled and non-removable filters explain the empty result without recovery", async ({
  page,
}) => {
  await page.goto("/?defaults=locked");
  await expect(page.getByText("No results match your filters.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear filters", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Filter patch count", { exact: true })).toHaveText("0");
});

test("auto height fits custom empty content and a horizontal scrollbar without vertical overflow", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) await page.setViewportSize({ width: 1000, height: 1000 });
  await page.goto("/?defaults=sizing");
  for (const name of ["Wide short table", "Tall empty table"]) {
    const grid = page.getByRole("grid", { name, exact: true });
    await expect
      .poll(() => grid.evaluate((element) => element.scrollHeight - element.clientHeight))
      .toBe(0);
  }
  const wide = page.getByRole("grid", { name: "Wide short table", exact: true });
  expect(await wide.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  const empty = page.getByRole("grid", { name: "Tall empty table", exact: true });
  const action = empty.getByRole("button", { name: "Create record" });
  await expect(action).toBeInViewport();
  expect(
    (await action.boundingBox())!.y + (await action.boundingBox())!.height,
  ).toBeLessThanOrEqual((await empty.boundingBox())!.y + (await empty.boundingBox())!.height);
});
