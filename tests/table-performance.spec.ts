import type { PerformanceHarnessWindow } from "./table-performance/types";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:8796/?rows=100000&columns=100");
});

test("bounds the DOM and renderer work while preserving inline callbacks", async ({ page }) => {
  const cells = page.getByRole("gridcell");
  await expect(cells.first()).toHaveText("0:0");
  expect(await cells.count()).toBeLessThan(600);
  await page.evaluate(() => {
    const harness = window as unknown as PerformanceHarnessWindow;
    Object.assign(window, { previousFirstRow: harness.table.getRow("0") });
  });
  await page.getByRole("button", { name: "Update parent" }).click();
  await expect(cells.first()).toHaveText("0:1");
  expect(
    await page.evaluate(() => {
      const harness = window as unknown as PerformanceHarnessWindow & { previousFirstRow: unknown };
      return harness.table.getRow("0") === harness.previousFirstRow;
    }),
  ).toBe(true);
  await page.evaluate(() => {
    (window as unknown as PerformanceHarnessWindow).metrics.renders = 0;
  });
  await page.setViewportSize({
    width: Math.max(280, page.viewportSize()!.width - 100),
    height: 800,
  });
  await page.waitForTimeout(100);
  expect(
    await page.evaluate(() => (window as unknown as PerformanceHarnessWindow).metrics.renders),
  ).toBe(0);
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.getByRole("grid").evaluate((el) => {
    el.scrollTop = 44000;
    el.scrollLeft = 7000;
  });
  await expect(page.locator('[data-row-id="1000"][data-column-id="column-45"]')).toBeVisible();
  expect(await cells.count()).toBeLessThan(600);
  const first = page.locator('[data-row-id="1000"][data-column-id="column-0"]');
  const last = page.locator('[data-row-id="1000"][data-column-id="column-99"]');
  await expect(first).toBeInViewport();
  await expect(last).toBeInViewport();
});

test("immutable record updates invalidate the row model", async ({ page }) => {
  await page.getByRole("button", { name: "Update first row" }).click();
  await expect(page.locator('[data-row-id="0"][data-column-id="column-0"]')).toHaveText("999:0");
});

test("rendering a new row does not allocate all offscreen cells", async ({ page }) => {
  await page.evaluate(() => {
    const row = (window as unknown as PerformanceHarnessWindow).table.getRow("1000");
    row.getAllCellsByColumnId = () => {
      throw Error("Eager cell allocation");
    };
    row.getAllCells = () => {
      throw Error("Eager cell allocation");
    };
  });
  await page.getByRole("grid").evaluate((el) => {
    el.scrollTop = 44000;
  });
  await expect(page.locator('[data-row-id="1000"][data-column-id="column-0"]')).toHaveText(
    "1000:0",
  );
});

test("horizontal scrolling preserves a focused custom input", async ({ page }) => {
  await page.goto("http://127.0.0.1:8796/?rows=100000&columns=100&editor");
  const input = page.getByRole("textbox", { name: "Edit 0", exact: true });
  // On small screens the editor starts outside the viewport.
  await input.focus();
  await input.fill("Uncommitted edit");
  await page.getByRole("grid").evaluate((el) => {
    el.scrollLeft = 7000;
  });
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("Uncommitted edit");
});

test("keyboard crosses unmounted columns and copying only visits selected rows", async ({
  page,
}) => {
  await page.locator('[data-row-id="0"][data-column-id="column-0"]').click();
  for (let i = 0; i < 25; i++) await page.keyboard.press("ArrowRight");
  const focused = page.locator('[data-row-id="0"][data-column-id="column-25"]');
  await expect(focused).toBeFocused();
  await expect(focused).toBeInViewport();
  const result = await page.evaluate(() => {
    const { table, copySelection } = window as unknown as PerformanceHarnessWindow;
    // Visiting an unrelated row to find selected cells would allocate its whole cell model.
    const unrelated = table.getRow("99999");
    unrelated.getVisibleCells = () => {
      throw Error("Copy scanned an unselected row");
    };
    return copySelection();
  });
  expect(result).toBe("25");
});

test("selecting ten million cells keeps rendering bounded", async ({ page }) => {
  await page.locator('[data-row-id="0"][data-column-id="column-0"]').click();
  await page.keyboard.press("Control+a");
  expect(
    await page.evaluate(() =>
      (window as unknown as PerformanceHarnessWindow).table.getSelectedCellCount(),
    ),
  ).toBe(10000000);
  expect(await page.getByRole("gridcell").count()).toBeLessThan(600);
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() =>
      (window as unknown as PerformanceHarnessWindow).table.getSelectedCellCount(),
    ),
  ).toBe(0);
});

test("large client sorting and filtering preserve displayed selection values", async ({ page }) => {
  await page.evaluate(() => {
    const { table } = window as unknown as PerformanceHarnessWindow;
    table.setSorting([{ id: "column-0", desc: true }]);
  });
  await expect(page.locator('[data-column-id="column-0"][role="gridcell"]').first()).toHaveText(
    "99999:0",
  );
  await page.evaluate(() => {
    const { table } = window as unknown as PerformanceHarnessWindow;
    table.setColumnFilters([{ id: "column-0", value: [99990, 99999] }]);
  });
  await expect(page.getByRole("grid")).toHaveAttribute("aria-rowcount", "11");
  const copied = await page.evaluate(() => {
    const { table, copySelection } = window as unknown as PerformanceHarnessWindow;
    table.selectCellRange({
      anchorRowId: "99999",
      anchorColumnId: "column-1",
      focusRowId: "99990",
      focusColumnId: "column-1",
    });
    return copySelection();
  });
  expect(copied).toBe(Array.from({ length: 10 }, (_, i) => String(100000 - i)).join("\n"));
});

test("end pins stay fully visible when a wide offscreen gap precedes them", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  const grid = page.getByRole("grid");
  await grid.evaluate((el) => {
    el.scrollLeft = 100;
  });
  const right = (await grid.boundingBox())!.x + (await grid.boundingBox())!.width;
  for (const role of ["gridcell", "columnheader"]) {
    const pin = page.locator(`[role="${role}"][data-column-id="column-99"]`).first();
    await expect(pin).toBeInViewport({ ratio: 1 });
    const box = (await pin.boundingBox())!;
    expect(Math.abs(box.x + box.width - right)).toBeLessThan(2);
  }
});
