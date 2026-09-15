import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage demonstrates the real table and preserves filter integration", async ({ page }) => {
  await page.goto("/");
  const grid = page.getByRole("grid", { name: "Issues", exact: true });
  await expect(grid).toBeVisible();
  await grid.getByRole("button", { name: "Issue", exact: true }).click();
  await expect(
    grid
      .getByRole("columnheader")
      .filter({ has: page.getByRole("button", { name: "Issue", exact: true }) }),
  ).toHaveAttribute("aria-sort", "ascending");
  await page.getByRole("searchbox", { name: "Search issues" }).fill("installation");
  await expect(
    grid.getByRole("gridcell", { name: "Write the installation guide", exact: true }),
  ).toBeVisible();
  await expect(grid).toHaveAttribute("aria-rowcount", "2");
  await page.getByRole("button", { name: "Column settings" }).click();
  await page.getByRole("checkbox", { name: "Show Priority", exact: true }).click();
  await expect(grid.locator('[data-column-id="priority"]')).toHaveCount(0);
});

test("documentation navigation separates components and searches across guide headings", async ({
  page,
  isMobile,
}) => {
  await page.goto("/docs");
  const nav = page.getByRole("navigation", { name: "Documentation", exact: true });
  if (isMobile) {
    await expect(nav.getByRole("searchbox")).toBeHidden();
    await nav.getByRole("button").click();
  }
  await expect(nav.getByText("Table", { exact: true })).toBeVisible();
  await expect(nav.getByText("Filters", { exact: true })).toBeVisible();
  await nav.getByRole("searchbox").fill("clipboard");
  await nav.getByRole("link", { name: "Selection & clipboard", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Selection and clipboard");
  if (isMobile) {
    await expect(nav.getByRole("searchbox")).toBeHidden();
    await nav.getByRole("button").click();
  }
  await nav.getByRole("searchbox").fill("does-not-exist");
  await expect(nav.getByRole("status")).toContainText("No pages match");
  await nav.getByRole("searchbox").fill("");
  await expect(nav.getByRole("link", { name: "Installation", exact: true })).toBeVisible();
});

test("query state examples expose loading, errors and recovery with accessible markup", async ({
  page,
}) => {
  await page.goto("/docs/table/data");
  const states = page.getByRole("group", { name: "Simulate query state" });
  const grid = page.getByRole("grid", { name: "Query state example", exact: true });
  await states.getByRole("button", { name: "Loading", exact: true }).click();
  await expect(grid).toHaveAttribute("aria-busy", "true");
  await states.getByRole("button", { name: "Error", exact: true }).click();
  await expect(grid.getByRole("alert")).toContainText("Could not load projects.");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(grid.getByRole("gridcell", { name: "Website", exact: true })).toBeVisible();
  await states.getByRole("button", { name: "Empty", exact: true }).click();
  await expect(grid.getByRole("status")).toHaveText("No rows yet.");
  for (const dark of [false, true]) {
    if (dark) await page.getByRole("button", { name: "Toggle color theme" }).click();
    for (const state of ["Ready", "Empty", "Error", "Loading"]) {
      await states.getByRole("button", { name: state, exact: true }).click();
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(audit.violations).toEqual([]);
    }
  }
});
