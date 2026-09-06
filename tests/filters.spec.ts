import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("single selection filters the table and restores focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Edit Status filter" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitemradio", { name: "In progress", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "3 of 8 issues" })).toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Remove Status filter" }).click();
  await expect(trigger).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "8 of 8 issues" })).toBeVisible();
});

test("searchable multiselect applies immediately and preserves selections across searches", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit Assignee filter" }).click();
  const input = page.getByRole("searchbox", { name: "Search assignees" });
  await input.fill("mend");
  await input.press("ArrowDown");
  const mendy = page.getByRole("menuitemcheckbox", { name: "Mendy", exact: true });
  await expect(mendy).toBeFocused();
  await page.keyboard.press("Space");
  await expect(mendy).toBeChecked();
  await expect(input).toBeVisible();
  await input.fill("sam");
  await page.getByRole("menuitemcheckbox", { name: "Sam", exact: true }).click();
  await input.fill("");
  await expect(mendy).toBeChecked();
  await expect(page.getByRole("menuitemcheckbox", { name: "Sam", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Edit Assignee filter" })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "5 of 8 issues" })).toBeVisible();
});

test("text drafts validate, apply, and discard on Escape or outside dismissal", async ({
  page,
}) => {
  await page.goto("/docs/examples");
  const trigger = page.getByRole("button", { name: "Edit Tags filter" });
  const input = page.getByRole("textbox", { name: "Tags, separated by commas" });
  await trigger.click();
  await expect(input).toBeFocused();
  await input.fill("");
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await input.fill("not applied");
  await input.press("Escape");
  await expect(trigger).toContainText("design, frontend");
  await trigger.click();
  await expect(input).toHaveValue("design, frontend");
  await input.fill("also not applied");
  await page.getByRole("heading", { name: "Examples", exact: true }).click();
  await trigger.click();
  await expect(input).toHaveValue("design, frontend");
  await input.fill("one, two\none\tthree");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(trigger).toContainText("one, two, three");
  await expect(input).toHaveCount(0);
});

test("removal works while the editor is open", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit Assignee filter" }).click();
  await page.getByRole("button", { name: "Remove Assignee filter" }).click();
  await expect(page.getByRole("button", { name: "Edit Assignee filter" })).toHaveCount(0);
  await expect(page.getByRole("menu")).toHaveCount(0);
});

test("required filters remain editable without a remove button", async ({ page }) => {
  await page.goto("/docs/examples");
  const trigger = page.getByRole("button", { name: "Edit Visibility filter" });
  await expect(page.getByRole("button", { name: "Remove Visibility filter" })).toHaveCount(0);
  await trigger.click();
  const checkbox = page.getByRole("checkbox", { name: "Include archived items" });
  await checkbox.check();
  await expect(trigger).toContainText("All items");
  await checkbox.press("Escape");
  await expect(trigger).toBeFocused();
});

test("add, combine, and clear filters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Title", exact: true }).click();
  await page.getByRole("button", { name: "Edit Title filter" }).click();
  await page.getByRole("textbox", { name: "Title contains" }).fill("keyboard");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 of 8 issues" })).toBeVisible();
  await page.getByRole("button", { name: "Edit Status filter" }).click();
  await page.getByRole("menuitemradio", { name: "Done", exact: true }).click();
  await expect(page.getByText("No matching issues", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByRole("status").filter({ hasText: "8 of 8 issues" })).toBeVisible();
});

test("empty search can recover", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Edit Assignee filter" }).click();
  const input = page.getByRole("searchbox", { name: "Search assignees" });
  await input.fill("nobody matches");
  await expect(page.getByText("No options found.", { exact: true })).toBeVisible();
  await input.fill("alex");
  await expect(page.getByRole("menuitemcheckbox", { name: "Alex", exact: true })).toBeVisible();
});

test("public docs, previews, and registry are accessible without login", async ({
  page,
  request,
}) => {
  for (const path of [
    "/",
    "/docs",
    "/docs/installation",
    "/docs/components/filters",
    "/docs/examples",
    "/docs/api",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  const response = await request.get("/r/filters.json");
  expect(response.ok()).toBe(true);
  const item = await response.json();
  expect(item.name).toBe("filters");
  expect(item.files).toHaveLength(4);
  expect(response.headers()["access-control-allow-origin"]).toBe("*");
  const missing = await request.get("/does-not-exist");
  expect(missing.status()).toBe(404);
});

test("no serious accessibility violations in light, dark, and open editors", async ({ page }) => {
  await page.goto("/");
  for (const dark of [false, true]) {
    if (dark) await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveClass(dark ? /dark/ : /light/);
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    );
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  }
  await page.getByRole("button", { name: "Edit Assignee filter" }).click();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("toolbar search combines with filters and clears without resetting selections", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search issues" });
  await search.fill("keyboard");
  await expect(page.getByRole("status").filter({ hasText: "1 of 8 issues" })).toBeVisible();
  await page.getByRole("button", { name: "Edit Status filter" }).click();
  await page.getByRole("menuitemradio", { name: "Done", exact: true }).click();
  await expect(page.getByText("No matching issues", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await expect(page.getByRole("button", { name: "Edit Status filter" })).toContainText("Done");
  await expect(page.getByRole("status").filter({ hasText: "2 of 8 issues" })).toBeVisible();
  await search.fill("UI-039");
  await page.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name: "Priority", exact: true }).click();
  await expect(search).toHaveValue("UI-039");
  await expect(page.getByRole("button", { name: "Edit Priority filter" })).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("status").filter({ hasText: "8 of 8 issues" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open filters" })).toBeFocused();
});
