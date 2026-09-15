import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:8795" });

test("inline selection shares the data column and preserves focus, layout, and loaded-row semantics", async ({
  page,
}, testInfo) => {
  await page.goto("/?defaults=inline");
  const grid = page.getByRole("grid", { name: "Inline selection", exact: true });
  await expect(grid.getByRole("columnheader")).toHaveCount(2);
  const cell = grid.locator('[data-row-id="default-0"][data-column-id="title"]');
  const checkbox = cell.getByRole("checkbox");
  const disabledCheckbox = grid.getByRole("checkbox", { name: "Select row Item 001", exact: true });
  await page.mouse.move(0, 0);
  if (!testInfo.project.use.isMobile) {
    await expect(checkbox).toHaveCSS("opacity", "0");
    await expect(disabledCheckbox).toHaveCSS("opacity", "0");
  } else {
    await expect(checkbox).toHaveCSS("opacity", "1");
    await expect(disabledCheckbox).toHaveCSS("opacity", "1");
  }
  await grid.locator('[data-row-id="default-1"][data-column-id="title"]').hover();
  await expect(disabledCheckbox).not.toHaveCSS("opacity", "0");
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Toggle mixed multi-row selection" }).click();
  await expect(grid.getByRole("checkbox", { name: "Select loaded rows" })).toHaveCount(0);
  await expect(checkbox).toBeAttached();
  await page.getByRole("button", { name: "Toggle mixed multi-row selection" }).click();
  await expect(grid.getByRole("checkbox", { name: "Select loaded rows" })).toBeAttached();
  const text = cell.getByText("Item 000", { exact: true });
  const positionInCell = () =>
    text.evaluate((element) => {
      const text = element.getBoundingClientRect();
      const cell = element.closest('[role="gridcell"]')!.getBoundingClientRect();
      return { x: text.x - cell.x, y: text.y - cell.y, width: text.width, height: text.height };
    });
  const before = await positionInCell();
  await cell.hover();
  await expect(checkbox).not.toHaveCSS("opacity", "0");
  await checkbox.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(checkbox).toBeFocused();
  await expect(checkbox).toHaveCSS("opacity", "1");
  await page.keyboard.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(grid.getByRole("checkbox", { name: "Select loaded rows" })).toHaveAttribute(
    "aria-checked",
    "mixed",
  );
  await page.mouse.move(0, 0);
  await expect(checkbox).toHaveCSS("opacity", "1");
  expect(await positionInCell()).toEqual(before);
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
  await expect(disabledCheckbox).toBeDisabled();
  await grid.getByRole("checkbox", { name: "Select loaded rows" }).click();
  await expect(page.getByLabel("Selected IDs")).toHaveText("default-0,default-2");
  await page.getByRole("button", { name: "Append selection rows" }).click();
  await expect(page.getByLabel("Selected IDs")).toHaveText("default-0,default-2");
  await expect(grid.getByRole("checkbox", { name: "Select loaded rows" })).toHaveAttribute(
    "aria-checked",
    "mixed",
  );
  await grid.evaluate((element) => {
    element.scrollTop = 15000;
  });
  await expect.poll(() => grid.getByRole("checkbox").count()).toBeLessThan(40);
  await grid.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(checkbox).toBeChecked();
  await page.getByRole("button", { name: "Hide first column" }).click();
  await expect(
    grid.locator('[data-row-id="default-0"][data-column-id="group"]').getByRole("checkbox"),
  ).toBeChecked();
  await page.getByRole("button", { name: "Custom selection controls" }).click();
  await expect(grid.getByRole("checkbox")).toHaveCount(0);
  await page.getByRole("button", { name: "Custom selection controls" }).click();
  await page.getByRole("button", { name: "Toggle row selection" }).click();
  await expect(grid.getByRole("checkbox")).toHaveCount(0);
});
