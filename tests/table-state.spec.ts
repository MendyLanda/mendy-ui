import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.use({ baseURL: "http://127.0.0.1:8795" });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("matching selection survives pagination, keeps exclusions, and resets with query scope", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Select all matching", exact: true }).click();
  await expect(page.getByLabel("Count", { exact: true })).toHaveText("10000");
  await page.getByRole("checkbox", { name: "Select row item-0", exact: true }).click();
  await expect(page.getByLabel("Selection", { exact: true })).toContainText(
    '"excludedIds":["item-0"]',
  );
  await page.getByRole("button", { name: "Another page" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Select row item-20", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Count", { exact: true })).toHaveText("9999");
  await page.getByRole("button", { name: "Change scope" }).click();
  await expect(page.getByLabel("Count", { exact: true })).toHaveText("0");
  await expect(
    page.getByRole("checkbox", { name: "Select row item-20", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Change scope" }).click();
  await expect(page.getByLabel("Count", { exact: true })).toHaveText("0");
});
test("keyboard selection scrolls virtual rows; copy uses displayed values and leaves input copying alone", async ({
  page,
}) => {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).copiedText = value;
        },
      },
    });
  });
  await page.getByRole("button", { name: "Large dataset" }).click();
  const grid = page.getByRole("grid", { name: "Fixture" });
  await grid.locator('[data-row-id="item-0"][data-column-id="title"]').click();
  for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowDown");
  await expect(grid.locator('[data-row-id="item-40"][data-column-id="title"]')).toBeFocused();
  await page.keyboard.press("Control+c");
  await expect.poll(() => page.evaluate(() => (window as any).copiedText)).toBe("Item 40");
  await page.getByLabel("Native input").fill("Changed");
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Control+c");
  expect(await page.evaluate(() => (window as any).copiedText)).toBe("Item 40");
});
test("pinned end cells reach the viewport edge and interactive cells do not select", async ({
  page,
}) => {
  const grid = page.getByRole("grid", { name: "Fixture" });
  const action = grid.locator('[data-row-id="item-0"][data-column-id="actions"]');
  await grid.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  const right = await grid.evaluate(
    (el) => el.getBoundingClientRect().left + el.clientLeft + el.clientWidth,
  );
  const cell = await action.boundingBox();
  expect(Math.abs(cell!.x + cell!.width - right)).toBeLessThan(2);
  await action.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Edited", { exact: true })).toHaveText("item-0");
  await expect(action).toHaveAttribute("aria-selected", "false");
});
test("loading and retry states are distinct from empty results", async ({ page }) => {
  await page.getByRole("button", { name: "Simulate loading" }).click();
  await expect(page.getByRole("status", { name: "Loading rows" })).toBeVisible();
  await expect(page.getByText("No results.", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Simulate error" }).click();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("gridcell").first()).toBeVisible();
});
test("long content stays inside the grid in both themes without accessibility violations", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const theme of ["light", "dark"]) {
    if (theme === "dark") await page.getByRole("button", { name: "Theme", exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const result = await new AxeBuilder({ page }).include('[role="grid"]').analyze();
    expect(result.violations).toEqual([]);
  }
  expect(errors).toEqual([]);
});
test("copy follows pinned visual order and reports clipboard failures", async ({ page }) => {
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).copiedText = value;
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Column settings" }).click();
  await page.getByRole("button", { name: "Pin Amount to left", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.locator('[data-row-id="item-0"][data-column-id="title"]').click();
  await page.keyboard.press("Shift+ArrowLeft");
  await page.keyboard.press("Control+c");
  await expect.poll(() => page.evaluate(() => (window as any).copiedText)).toBe("0\tItem 0");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw Error("Denied");
        },
      },
    }),
  );
  await expect(page.locator('[data-row-id="item-0"][data-column-id="amount"]')).toBeFocused();
  await page.keyboard.press("Control+c");
  await expect(page.getByText("Could not copy selected cells", { exact: true })).toHaveCount(1);
});
test("column preferences restore on reload and remain separate between scopes", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Column settings" }).click();
  await page.getByRole("checkbox", { name: "Show Amount", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem(JSON.stringify(["mendy-table", "one", "fixture"]))),
    )
    .toContain('"amount":false');
  await page.reload();
  await expect(page.locator('[data-column-id="amount"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Change scope" }).click();
  await expect(page.locator('[data-column-id="amount"]').first()).toBeVisible();
});
test("narrow viewports keep middle columns reachable without discarding saved pins", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Column settings" }).click();
  await page.getByRole("button", { name: "Pin Title to left", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 340, height: 850 });
  const title = page.locator('[data-row-id="item-0"][data-column-id="title"]');
  await expect(title).toHaveCSS("position", "static");
  await page.setViewportSize({ width: 1100, height: 850 });
  await expect(title).toHaveCSS("position", "sticky");
});

test("loading uses the live column geometry and pinned boundaries in one scroll area", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const grid = page.getByRole("grid", { name: "Fixture" });
  const before = await grid.locator('[data-row-id="item-0"]').evaluateAll((cells) =>
    cells.map((cell) => ({
      id: cell.getAttribute("data-column-id"),
      width: cell.getBoundingClientRect().width,
      left: getComputedStyle(cell).borderLeftWidth,
      right: getComputedStyle(cell).borderRightWidth,
    })),
  );
  expect(before[0].right).toBe("4px");
  expect(before.at(-1)!.left).toBe("4px");
  await page.getByRole("button", { name: "Simulate loading" }).click();
  await expect(grid.getByRole("status", { name: "Loading rows" })).toBeVisible();
  const loading = await grid
    .locator('[data-slot="table-loading-row"]')
    .first()
    .locator('[data-slot="table-loading-cell"]')
    .evaluateAll((cells) =>
      cells.map((cell) => ({
        id: cell.getAttribute("data-column-id"),
        width: cell.getBoundingClientRect().width,
        left: getComputedStyle(cell).borderLeftWidth,
        right: getComputedStyle(cell).borderRightWidth,
      })),
    );
  expect(loading).toEqual(before);
  await expect(grid.getByRole("columnheader")).toHaveCount(before.length);
  expect(
    await grid.evaluate(
      (el) =>
        [...el.querySelectorAll("*")].filter((child) => {
          const style = getComputedStyle(child);
          return /auto|scroll/.test(style.overflowY) && child.scrollHeight > child.clientHeight;
        }).length,
    ),
  ).toBe(0);
  await page.setViewportSize({ width: 260, height: 800 });
  await expect(grid.locator('[data-slot="table-loading-cell"]').first()).toHaveCSS(
    "position",
    "static",
  );
  await expect(grid.locator('[data-slot="table-loading-cell"]').first()).toHaveCSS(
    "border-right-width",
    "1px",
  );
});

test("headers keep their column boundaries on wide screens and sort with a text-only hover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  const grid = page.getByRole("grid", { name: "Fixture" });
  const header = grid.getByRole("columnheader").last();
  await expect(header).toHaveCSS("border-right-width", "1px");
  const sort = grid.getByRole("button", { name: "Title", exact: true });
  await sort.hover();
  await expect(sort).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});
test("column settings support keyboard reordering, pin cycling, visibility and reset", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Column settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Column settings" });
  const handle = dialog.getByRole("button", { name: "Reorder Amount", exact: true });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await expect
    .poll(() =>
      dialog
        .locator("[data-column-setting]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-column-setting"))),
    )
    .toEqual(["_selection", "amount", "title", "actions"]);
  await dialog.getByRole("button", { name: "Pin Amount to left", exact: true }).click();
  await dialog.getByRole("button", { name: "Pin Amount to right", exact: true }).click();
  await dialog.getByRole("button", { name: "Unpin Amount", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Show Amount", exact: true }).click();
  await expect(dialog).toContainText("1 hidden");
  await dialog.getByRole("button", { name: "Reset columns", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Show Amount", exact: true })).toBeChecked();
  await expect(dialog.locator("[data-column-setting]").nth(2)).toHaveAttribute(
    "data-column-setting",
    "amount",
  );
});

test("column settings support pointer dragging without closing the panel", async ({ page }) => {
  await page.getByRole("button", { name: "Column settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Column settings" });
  const from = await dialog
    .getByRole("button", { name: "Reorder Title", exact: true })
    .boundingBox();
  const to = await dialog
    .getByRole("button", { name: "Reorder Amount", exact: true })
    .boundingBox();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2 + 8, { steps: 3 });
  const dragged = page.locator('[data-column-setting="title"][data-dragging="true"]');
  await expect(dragged).toBeVisible();
  const lifted = await dragged.boundingBox();
  const destinationY = to!.y + to!.height / 2 + 5;
  const liftY = from!.y + from!.height / 2 + 8;
  await page.mouse.move(to!.x + to!.width / 2, destinationY, { steps: 12 });
  // Wait for the browser's final drag frame before releasing the pointer.
  await expect
    .poll(async () => (await dragged.boundingBox())?.y ?? 0)
    .toBeCloseTo(lifted!.y + destinationY - liftY, 0);
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog
        .locator("[data-column-setting]")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-column-setting"))),
    )
    .toEqual(["_selection", "amount", "title", "actions"]);
  const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(accessibility.violations).toEqual([]);
});
