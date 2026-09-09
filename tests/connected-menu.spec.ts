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

test("Tab enters the editor and Shift+Tab returns to the selected filter", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop chooser has adjacent panels.");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const status = page.getByRole("button", { name: "Status", exact: true });
  await expect(status).toBeFocused();
  await status.press("Tab");
  const todo = page.getByRole("menuitemradio", { name: "Todo", exact: true });
  await expect(todo).toBeFocused();
  await todo.press("Shift+Tab");
  await expect(status).toBeFocused();
});

test("hover keeps keyboard navigation attached to the visible filter", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch selection does not hover.");
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  const assignee = page.getByRole("button", { name: "Assignee", exact: true });
  await assignee.hover();
  await expect(assignee).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("button", { name: "Title", exact: true })).toBeFocused();
});

test("unfinished text survives switching filters without applying it", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Title contains", exact: true });
  await title.fill("unfinished draft");
  if (isMobile)
    await page.getByRole("dialog").getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("button", { name: "Priority", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "High", exact: true }).click();
  if (isMobile)
    await page.getByRole("dialog").getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await expect(title).toHaveValue("unfinished draft");
  await expect(title).toBeFocused();
  await expect(page.getByRole("button", { name: "Edit Title filter", exact: true })).toHaveCount(0);
  await title.press("Enter");
  await expect(page.getByRole("button", { name: "Edit Title filter", exact: true })).toContainText(
    "unfinished draft",
  );
});

test("diagonal movement into the editor keeps the intended filter", async ({ page, isMobile }) => {
  test.skip(isMobile, "Touch selection does not hover.");
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  const status = page.getByRole("button", { name: "Status", exact: true });
  const box = (await status.boundingBox())!;
  // Cross Priority and Assignee on the way to the bottom of Status's editor.
  await page.mouse.move(box.x + box.width - 65, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width + 20, box.y + box.height * 3.5, { steps: 12 });
  await expect(status).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("menuitemradio", { name: "Done", exact: true })).toBeVisible();
});

test("hover does not interrupt typing, while clicking switches and preserves the draft", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch has no hover preview.");
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Title contains", exact: true });
  await input.fill("keep typing");
  const priority = page.getByRole("button", { name: "Priority", exact: true });
  await priority.hover();
  await expect(input).toBeFocused();
  await input.pressSequentially(" here");
  await priority.click();
  await expect(page.getByRole("menuitemradio", { name: "High", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await expect(input).toHaveValue("keep typing here");
});

test("unmatched typeahead stays on the filter list and entry focuses the checked option", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop chooser has adjacent panels.");
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  const priority = page.getByRole("button", { name: "Priority", exact: true });
  await priority.focus();
  await priority.press("h");
  await expect(priority).toBeFocused();
  await priority.press("Enter");
  const medium = page.getByRole("menuitemradio", { name: "Medium", exact: true });
  await medium.click();
  await medium.press("ArrowLeft");
  await expect(priority).toBeFocused();
  await expect(priority).toHaveAttribute("aria-description", "Filter applied");
  await priority.press("ArrowRight");
  await expect(medium).toBeFocused();
});

test("Tab exits in page order, Shift+Tab returns to the trigger, and outside focus is preserved", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop chooser has adjacent panels.");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  await page.getByRole("button", { name: "Status", exact: true }).press("Shift+Tab");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await page.getByRole("button", { name: "Status", exact: true }).press("Tab");
  await page.getByRole("menuitemradio", { name: "Todo", exact: true }).press("Tab");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Apply Status filter", exact: true }),
  ).toBeFocused();
  await trigger.click();
  const search = page.getByRole("searchbox").first();
  await search.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(search).toBeFocused();
});

test("option search survives browsing, clearing another filter preserves drafts, dismissal resets drafts", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  await trigger.click();
  const back = async () => {
    if (isMobile)
      await page.getByRole("dialog").getByRole("button", { name: "Filters", exact: true }).click();
  };
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await page.getByRole("textbox", { name: "Title contains", exact: true }).fill("pending");
  await back();
  await page.getByRole("button", { name: "Assignee", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search assignees", exact: true }).fill("Alex");
  await back();
  await page.getByRole("button", { name: "Priority", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "High", exact: true }).click();
  await page.getByRole("button", { name: "Clear Priority filter", exact: true }).click();
  await back();
  await page.getByRole("button", { name: "Assignee", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search assignees", exact: true })).toHaveValue(
    "Alex",
  );
  await back();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Title contains", exact: true })).toHaveValue(
    "pending",
  );
  await page.keyboard.press("Escape");
  if (isMobile) await page.keyboard.press("Escape");
  await trigger.click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Title contains", exact: true })).toHaveValue("");
});

test("list keys wrap, Home and End jump, and RTL entry and return arrows are reversed", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "The desktop chooser has adjacent panels.");
  await page.goto("/");
  await page.evaluate(() => (document.documentElement.dir = "rtl"));
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const status = page.getByRole("button", { name: "Status", exact: true });
  const title = page.getByRole("button", { name: "Title", exact: true });
  await expect(status).toBeFocused();
  await status.press("ArrowUp");
  await expect(title).toBeFocused();
  await title.press("ArrowDown");
  await expect(status).toBeFocused();
  await status.press("End");
  await expect(title).toBeFocused();
  await title.press("Home");
  await expect(status).toBeFocused();
  await status.press("p");
  const priority = page.getByRole("button", { name: "Priority", exact: true });
  await expect(priority).toBeFocused();
  await priority.press("ArrowLeft");
  const high = page.getByRole("menuitemradio", { name: "High", exact: true });
  await expect(high).toBeFocused();
  await high.press("ArrowRight");
  await expect(priority).toBeFocused();
});

test("pointer grace expires when resting on a row and cannot reopen a dismissed menu", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch has no hover preview.");
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open filters", exact: true });
  await trigger.click();
  const status = page.getByRole("button", { name: "Status", exact: true });
  const box = (await status.boundingBox())!;
  await page.mouse.move(box.x + box.width - 80, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width - 20, box.y + box.height * 1.5, { steps: 4 });
  const priority = page.getByRole("button", { name: "Priority", exact: true });
  await expect(priority).toHaveAttribute("aria-expanded", "true");
  await status.hover();
  await page.mouse.move(box.x + box.width - 80, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width - 20, box.y + box.height * 1.5, { steps: 4 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.waitForTimeout(350);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("mouse preview has no keyboard ring, but arrow navigation shows it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Touch does not use the desktop preview.");
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  const status = page.getByRole("button", { name: "Status", exact: true });
  const pointerShadow = await status.evaluate((e) => getComputedStyle(e).boxShadow);
  await status.press("ArrowDown");
  const priority = page.getByRole("button", { name: "Priority", exact: true });
  await expect(priority).toBeFocused();
  await expect
    .poll(() => priority.evaluate((e) => getComputedStyle(e).boxShadow))
    .not.toBe(pointerShadow);
});

test("empty text editors start neutral and validate an attempted save", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  await page.getByRole("button", { name: "Title", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Title contains", exact: true });
  await expect(title).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByRole("dialog").getByRole("alert")).toHaveCount(0);
  await title.press("Enter");
  await expect(title).toHaveAttribute("aria-invalid", "true");
  await expect(title).toHaveAccessibleDescription("Enter a title to search for.");
  await expect(page.getByRole("button", { name: "Edit Title filter", exact: true })).toHaveCount(0);
  await title.fill("Valid title");
  await expect(title).toHaveAttribute("aria-invalid", "false");
  await title.press("Enter");
  await expect(page.getByRole("button", { name: "Edit Title filter", exact: true })).toContainText(
    "Valid title",
  );
});
