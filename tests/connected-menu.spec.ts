import { expect, test } from "@playwright/test";

test("the connected menu opens immediately and preserves hover, click, and Back behavior", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  await trigger.click();
  const menu = page.getByRole("dialog", { name: "Filters", exact: true });
  await expect(menu).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("button", { name: "Status", exact: true })).toHaveCSS(
    "transition-property",
    "none",
  );
  if (isMobile) {
    await expect(page.getByRole("menuitemradio")).toHaveCount(0);
    await page.getByRole("button", { name: "Assignee", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Status", exact: true })).toHaveCount(0);
  } else {
    await expect(page.getByRole("menuitemradio", { name: "Todo", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Assignee", exact: true }).hover();
    await expect(page.getByRole("searchbox", { name: "Search assignees" })).not.toBeFocused();
    await page.getByRole("button", { name: "Assignee", exact: true }).click();
  }
  const input = page.getByRole("searchbox", { name: "Search assignees" });
  await expect(input).toBeFocused();
  await expect(page.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await page.getByRole("menuitemcheckbox", { name: "Alex", exact: true }).click();
  await expect(menu).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Assignee filter" })).toContainText("Alex");
  if (isMobile) {
    await menu.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(page.getByRole("button", { name: "Assignee", exact: true })).toBeFocused();
  }
  await page.getByRole("button", { name: "Priority", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "High", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit Priority filter" })).toContainText("High");
  await page.keyboard.press("Escape");
  if (isMobile) {
    await expect(page.getByRole("button", { name: "Priority", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
  }
  await expect(trigger).toBeFocused();
});

test("number range typing retains focus and clearing resets its editor", async ({ page }) => {
  await page.goto("/docs/advanced");
  const project = page.getByRole("region", { name: "Project filters", exact: true });
  await project.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("button", { name: "Team size", exact: true }).click();
  const input = page.getByRole("spinbutton", { name: "Minimum", exact: true });
  await expect(input).toBeFocused();
  await input.pressSequentially("12");
  await expect(input).toHaveValue("12");
  await expect(input).toBeFocused();
  await expect(project.getByRole("button", { name: "Edit Team size filter" })).toContainText("12");
  await page.getByRole("button", { name: "Clear Team size filter", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(project.getByRole("button", { name: "Edit Team size filter" })).toHaveCount(0);
});

test("a grouped editor applies and clears its fields without closing the menu", async ({
  page,
}) => {
  await page.goto("/docs/advanced");
  const project = page.getByRole("region", { name: "Project filters", exact: true });
  await project.getByRole("button", { name: "Open filters" }).click();
  await page.getByRole("button", { name: "Status", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Filters", exact: true });
  await menu.getByRole("menuitemcheckbox", { name: "Active", exact: true }).click();
  const optionMenus = menu.getByRole("menu");
  await expect(optionMenus).toHaveCount(3);
  await optionMenus.nth(1).getByRole("menuitemradio").first().click();
  await expect(project.locator('[data-slot="filter-chip"]')).toHaveCount(2);
  await menu.getByRole("button", { name: "Clear Status filter", exact: true }).click();
  await expect(project.locator('[data-slot="filter-chip"]')).toHaveCount(0);
  await expect(
    menu.getByRole("menuitemcheckbox", { name: "Active", exact: true }),
  ).not.toBeChecked();
  await expect(menu).toBeVisible();
});

test("calendar and option panels fit small screens and keep theme corners", async ({ page }) => {
  for (const width of [320, 639, 640, 1280]) {
    await page.setViewportSize({ width, height: 650 });
    await page.goto("/docs/advanced");
    await page.evaluate(() => document.documentElement.style.setProperty("--radius", "0px"));
    await page.getByRole("button", { name: "Open filters" }).first().click();
    await page.getByRole("button", { name: "Created date", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Filters", exact: true });
    await expect(menu).toHaveCSS("border-radius", "0px");
    await expect(menu).toHaveCSS("animation-name", "none");
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.height).toBeLessThanOrEqual(480);
    await menu.getByRole("button", { name: "Clear date", exact: true }).click();
    await expect(menu).toBeVisible();
  }
});
