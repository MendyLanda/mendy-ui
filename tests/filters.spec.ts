import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function openFilter(page: Page, name: string) {
  await page.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}

async function addStatus(page: Page, value = "Todo") {
  await openFilter(page, "Status");
  await page.getByRole("menuitemradio", { name: value, exact: true }).click();
}

async function addAssignee(page: Page, value = "Mendy") {
  await openFilter(page, "Assignee");
  await page.getByRole("menuitemcheckbox", { name: value, exact: true }).click();
  await page.keyboard.press("Escape");
}

function count(page: Page, value: number) {
  return page
    .getByRole("status", { includeHidden: true })
    .filter({ hasText: `${value} of 8 issues` });
}

test("menu items reveal options before applying, then the chip edits the value", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await openFilter(page, "Status");
  await expect(page.getByRole("menuitem", { name: "Status", exact: true })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Edit Status filter", includeHidden: true }),
  ).toHaveCount(0);
  await expect(count(page, 8)).toBeVisible();
  await page.getByRole("menuitemradio", { name: "Todo", exact: true }).click();
  const trigger = page.getByRole("button", { name: "Edit Status filter", includeHidden: true });
  await expect(trigger).toContainText("Todo");
  await expect(count(page, 3)).toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("menuitemradio", { name: "In progress", exact: true }).click();
  await expect(trigger).toContainText("In progress");
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Remove Status filter" }).click();
  await expect(trigger).toHaveCount(0);
  await expect(count(page, 8)).toBeVisible();
});

test("multiselect applies inside the submenu and chips remain editable", async ({ page }) => {
  await page.goto("/");
  await openFilter(page, "Assignee");
  const input = page.getByRole("searchbox", { name: "Search assignees" });
  await input.fill("mend");
  await input.press("ArrowDown");
  const mendy = page.getByRole("menuitemcheckbox", { name: "Mendy", exact: true });
  await expect(mendy).toBeFocused();
  await page.keyboard.press("Space");
  await expect(mendy).toBeChecked();
  await expect(input).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Assignee filter", includeHidden: true }),
  ).toContainText("Mendy");
  await input.fill("sam");
  await page.getByRole("menuitemcheckbox", { name: "Sam", exact: true }).click();
  await input.fill("");
  await expect(mendy).toBeChecked();
  await expect(count(page, 5)).toBeVisible();
  await page.keyboard.press("Escape");
  const trigger = page.getByRole("button", { name: "Edit Assignee filter", includeHidden: true });
  await trigger.click();
  await expect(mendy).toBeChecked();
  await expect(page.getByRole("menuitemcheckbox", { name: "Sam", exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("text is entered and applied in the submenu without creating an empty chip", async ({
  page,
}) => {
  await page.goto("/");
  await openFilter(page, "Title");
  const input = page.getByRole("textbox", { name: "Title contains" });
  await expect(input).toBeFocused();
  await expect(page.getByRole("button", { name: "Apply", exact: true })).toBeDisabled();
  await input.fill("discard this");
  await expect(
    page.getByRole("button", { name: "Edit Title filter", includeHidden: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await openFilter(page, "Title");
  await expect(input).toHaveValue("");
  await input.fill("keyboard");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Title filter", includeHidden: true }),
  ).toContainText("keyboard");
  await expect(count(page, 1)).toBeVisible();
  await page.getByRole("button", { name: "Edit Title filter", includeHidden: true }).click();
  await expect(input).toHaveValue("keyboard");
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
  await addAssignee(page);
  await page.getByRole("button", { name: "Edit Assignee filter", includeHidden: true }).click();
  await page.getByRole("button", { name: "Remove Assignee filter" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Assignee filter", includeHidden: true }),
  ).toHaveCount(0);
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

test("empty search can recover inside a submenu", async ({ page }) => {
  await page.goto("/");
  await openFilter(page, "Assignee");
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
  expect((await response.json()).files).toHaveLength(4);
  expect(response.headers()["access-control-allow-origin"]).toBe("*");
  expect((await request.get("/does-not-exist")).status()).toBe(404);
});

test("no accessibility violations in both themes and submenu editors", async ({ page }) => {
  await page.goto("/");
  for (const dark of [false, true]) {
    if (dark) await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveClass(dark ? /dark/ : /light/);
    for (const name of [null, "Status", "Assignee", "Title"]) {
      if (name) await openFilter(page, name);
      await page.evaluate(() =>
        Promise.all(document.getAnimations().map((animation) => animation.finished)),
      );
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      if (name) await page.keyboard.press("Escape");
    }
  }
});

test("toolbar search combines with filters and clears without resetting selections", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search issues" });
  await search.fill("keyboard");
  await expect(count(page, 1)).toBeVisible();
  await addStatus(page, "Done");
  await expect(page.getByText("No matching issues", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Edit Status filter", includeHidden: true }),
  ).toContainText("Done");
  await expect(count(page, 2)).toBeVisible();
  await search.fill("UI-039");
  await openFilter(page, "Priority");
  await expect(
    page.getByRole("button", { name: "Edit Priority filter", includeHidden: true }),
  ).toHaveCount(0);
  await page.getByRole("menuitemradio", { name: "Medium", exact: true }).click();
  await expect(search).toHaveValue("UI-039");
  await expect(count(page, 1)).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(search).toHaveValue("");
  await expect(count(page, 8)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open filters" })).toBeFocused();
});

test("chips animate on entry and respect reduced motion", async ({ page }) => {
  await page.goto("/");
  await addStatus(page);
  const chip = page.locator('[data-slot="filter-chip"]');
  await expect(chip).toHaveCSS("animation-name", "enter");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(chip).toHaveCSS("animation-name", "none");
});

test("arrow keys explore submenus without applying and clearing a chip returns focus", async ({
  page,
}) => {
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open filters" });
  await menu.focus();
  await page.keyboard.press("Enter");
  const status = page.getByRole("menuitem", { name: "Status", exact: true });
  await expect(status).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitemradio", { name: "Todo", exact: true })).toBeFocused();
  await expect(page.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(status).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitemradio", { name: "Todo", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Edit Status filter" }).click();
  await page.getByRole("menuitemradio", { name: "Any status", exact: true }).click();
  await expect(page.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await expect(menu).toBeFocused();
});

test("touch selection opens options before adding a chip", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Touch interaction on the mobile device");
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters" }).tap();
  await page.getByRole("menuitem", { name: "Status", exact: true }).tap();
  await expect(page.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await page.getByRole("menuitemradio", { name: "Todo", exact: true }).tap();
  await expect(page.getByRole("button", { name: "Edit Status filter" })).toContainText("Todo");
});
