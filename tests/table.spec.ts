import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/docs/components/table");
});
test("table virtualizes, sorts, resizes and keeps interactive controls usable", async ({
  page,
}) => {
  const grid = page.getByRole("grid", { name: "Projects", exact: true });
  await expect(grid.getByRole("gridcell").first()).toBeVisible();
  const projectHeader = grid
    .getByRole("columnheader")
    .filter({ has: page.getByRole("button", { name: "Project", exact: true }) });
  await grid.getByRole("button", { name: "Project", exact: true }).click();
  await expect(projectHeader).toHaveAttribute("aria-sort", "ascending");
  await grid.getByRole("button", { name: "Project", exact: true }).click();
  await expect(projectHeader).toHaveAttribute("aria-sort", "descending");
  await grid.getByRole("button", { name: "Project", exact: true }).click();
  const cell = grid.locator('[data-row-id="project-0"][data-column-id="name"]');
  await cell.click();
  await expect(cell).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(grid.locator('[data-row-id="project-1"][data-column-id="name"]')).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const resize = grid.getByRole("separator", { name: "Resize Project", exact: true });
  const before = Number(await resize.getAttribute("aria-valuenow"));
  await resize.focus();
  await page.keyboard.press("ArrowRight");
  await expect(resize).toHaveAttribute("aria-valuenow", String(before + 10));
  await grid.getByRole("checkbox", { name: "Select row 1", exact: true }).click();
  await expect(page.getByRole("region", { name: "Selected row actions" })).toContainText(
    "1 selected",
  );
  await page.getByRole("button", { name: "Try 10,000 rows" }).click();
  await expect(grid).toHaveAttribute("aria-rowcount", "10001");
  expect(await grid.getByRole("row").count()).toBeLessThan(50);
  await grid.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(grid.locator('[data-row-id="project-9999"][data-column-id="name"]')).toBeVisible();
});
test("column settings can hide and restore a column", async ({ page }) => {
  await page.getByRole("button", { name: "Column settings" }).click();
  await page.getByRole("checkbox", { name: "Show Owner", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("grid").locator('[data-column-id="owner.name"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Column settings" }).click();
  await page.getByRole("button", { name: "Reset columns" }).click();
  await expect(
    page.getByRole("grid").locator('[data-column-id="owner.name"]').first(),
  ).toBeVisible();
});
