import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("http://127.0.0.1:8795/?details");
});

test("measures multiline content and expanded detail rows without overlap", async ({ page }) => {
  const grid = page.getByRole("grid", { name: "Detailed records", exact: true });
  const first = grid
    .locator('[role="row"]')
    .filter({ has: page.getByRole("button", { name: "Details record-0", exact: true }) })
    .first();
  const next = grid.locator('[data-row-id="record-1"][data-column-id="id"]');
  const firstBox = await first.boundingBox();
  expect(firstBox!.height).toBeGreaterThan(44);
  expect((await next.boundingBox())!.y).toBeGreaterThanOrEqual(firstBox!.y + firstBox!.height - 1);
  await page.getByRole("button", { name: "Details record-0", exact: true }).click();
  const nested = page.getByRole("grid", { name: "Nested records", exact: true });
  await expect(nested).toBeVisible();
  const nestedBox = await nested.boundingBox();
  await expect
    .poll(async () => (await next.boundingBox())?.y ?? 0)
    .toBeGreaterThanOrEqual(nestedBox!.y + nestedBox!.height);
  await expect(page.locator('output[aria-label="Clicked row"]')).toHaveText("");
  await expect(page.locator('output[aria-label="Action count"]')).toHaveText("1");
});

test("nested keyboard selection stays inside its table", async ({ page }) => {
  await page.getByRole("button", { name: "Details record-0", exact: true }).click();
  const nested = page.getByRole("grid", { name: "Nested records", exact: true });
  await nested.getByRole("gridcell", { name: "Child value", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+a");
  await expect(nested.locator('[role="gridcell"][aria-selected="true"]')).toHaveCount(1);
  const outer = page.getByRole("grid", { name: "Detailed records", exact: true });
  await expect(outer.locator('[data-row-id^="record-"][aria-selected="true"]')).toHaveCount(0);
});

test("row clicks skip controls and native details can expand", async ({ page }) => {
  await page.locator('[data-row-id="record-1"][data-column-id="id"]').click();
  await expect(page.locator('output[aria-label="Clicked row"]')).toHaveText("record-1");
  await page.getByText("More record-1", { exact: true }).click();
  await expect(page.getByText("More record-1", { exact: true }).locator("..")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator('output[aria-label="Clicked row"]')).toHaveText("record-1");
});

test("single-click actions run once on double-click and also work with Enter", async ({ page }) => {
  await page.locator('[data-row-id="record-1"][data-column-id="id"]').dblclick();
  await expect(page.locator('output[aria-label="Row click count"]')).toHaveText("1");
  await page.keyboard.press("Enter");
  await expect(page.locator('output[aria-label="Row click count"]')).toHaveText("2");
});

test("measured rows reflow after resize and preserve copying through virtualization", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text: string) => {
          (window as unknown as { copiedText: string }).copiedText = text;
        },
      },
    });
  });
  await page.reload();
  const grid = page.getByRole("grid", { name: "Detailed records", exact: true });
  const first = grid.locator('[data-row-id="record-0"][data-column-id="title"]');
  const initialHeight = (await first.boundingBox())!.height;
  await page.setViewportSize({ width: 520, height: 900 });
  await expect.poll(async () => (await first.boundingBox())!.height).toBeGreaterThan(initialHeight);
  const row1 = grid.locator('[data-row-id="record-1"][data-column-id="id"]');
  await expect
    .poll(async () => {
      const a = await first.boundingBox(),
        b = await row1.boundingBox();
      return b!.y - (a!.y + a!.height);
    })
    .toBeGreaterThanOrEqual(-1);
  await grid.locator('[data-row-id="record-0"][data-column-id="id"]').click();
  await page.keyboard.press("ControlOrMeta+a");
  await grid.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(grid.locator('[data-row-id="record-199"][data-column-id="id"]')).toBeVisible();
  await grid.evaluate((el) => {
    el.scrollTop = 0;
  });
  await expect(first).toBeVisible();
  await page.keyboard.press("ControlOrMeta+c");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { copiedText?: string }).copiedText?.split("\n").length,
      ),
    )
    .toBe(200);
});

test("content-fitting viewport grows with expanded details and stays capped", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.goto("http://127.0.0.1:8795/?details&fit");
  const grid = page.getByRole("grid", { name: "Detailed records", exact: true });
  const box = await grid.boundingBox();
  expect(box!.height).toBeLessThan(450);
  await page.getByRole("button", { name: "Details record-0", exact: true }).click();
  await expect.poll(async () => (await grid.boundingBox())!.height).toBeGreaterThan(box!.height);
  expect((await grid.boundingBox())!.height).toBeLessThanOrEqual(650);
});

test("expanded details stay within a narrow viewport while columns scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const grid = page.getByRole("grid", { name: "Detailed records", exact: true });
  await page.getByRole("button", { name: "Details record-0", exact: true }).click();
  const nested = page.getByRole("grid", { name: "Nested records", exact: true });
  await expect(nested).toBeVisible();
  const assertFits = async () => {
    const outerBox = (await grid.boundingBox())!;
    const nestedBox = (await nested.boundingBox())!;
    expect(nestedBox.x).toBeGreaterThanOrEqual(outerBox.x);
    expect(nestedBox.x + nestedBox.width).toBeLessThanOrEqual(outerBox.x + outerBox.width);
  };
  await assertFits();
  await grid.evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await expect.poll(async () => grid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await assertFits();
});
