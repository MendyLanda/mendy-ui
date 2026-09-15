import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const url = "http://127.0.0.1:8797";
test("uncontrolled and controlled sheets close and restore trigger focus", async ({ page }) => {
  await page.goto(url);
  for (const name of ["uncontrolled", "controlled"]) {
    const trigger = page.getByRole("button", { name: `Open ${name}`, exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});
test("every close route guards unsaved changes and pin retains them", async ({
  page,
  isMobile,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Unsaved draft");
  for (const close of ["button", "escape", "api", "outside"]) {
    if (close === "outside" && isMobile) continue;
    if (close === "button")
      await page.getByRole("button", { name: "Close sheet", exact: true }).click();
    if (close === "escape") await page.keyboard.press("Escape");
    if (close === "api") await page.getByRole("button", { name: "Close by API" }).click();
    if (close === "outside")
      await page.locator("[data-mendy-sheet-overlay]").click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Keep editing" }).click();
    await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(
      "Unsaved draft",
    );
  }
  if (!isMobile) {
    await page.keyboard.press("Escape");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Pin sheet", exact: true })
      .click();
    await expect(page.locator("[data-mendy-sheet-overlay]")).toHaveCount(0);
    await page.getByRole("button", { name: "Navigate" }).click();
    await expect(page.locator("[data-route]")).toHaveText("second");
    await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(
      "Unsaved draft",
    );
  }
  await page.getByRole("button", { name: "Close sheet", exact: true }).click();
  await page.getByRole("button", { name: "Discard changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("nested popover consumes Escape before sheet; tiled and covered sheets close in order", async ({
  page,
}) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page.getByRole("button", { name: "Choose category" }).click();
  await expect(page.getByRole("button", { name: "Category A" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Category A" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Project one" })).toBeVisible();
  await page.getByRole("button", { name: "Open related" }).click();
  await expect(page.getByRole("dialog", { name: "Project child" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Project child" })).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Project one" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("pinning, responsive fallback and direction keep panels inside viewport", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop resize scenario");
  for (const rtl of [false, true]) {
    await page.evaluate(() => sessionStorage.clear()).catch(() => {});
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`${url}?instant${rtl ? "&rtl" : ""}`);
    await page.getByRole("button", { name: "Open project", exact: true }).click();
    const one = page.locator('[data-sheet-id="one"]');
    const box = await one.boundingBox();
    expect(box!.x).toBe(rtl ? 0 : 880);
    await page
      .getByRole("button", { name: rtl ? "הצמדת החלונית" : "Pin sheet", exact: true })
      .click();
    await page.getByRole("button", { name: "Open another", exact: true }).click();
    const two = await page.locator('[data-sheet-id="two"]').boundingBox();
    expect(two!.x).toBe(rtl ? 520 : 360);
    await page.setViewportSize({ width: 390, height: 800 });
    await expect(one).toHaveAttribute("data-covered", "true");
    const mobile = await page.locator('[data-sheet-id="two"]').boundingBox();
    expect(mobile!.x).toBe(0);
    expect(mobile!.width).toBe(390);
    await page.keyboard.press("Escape");
    await expect(one).toBeVisible();
    await page.setViewportSize({ width: 1400, height: 900 });
    await expect(one).toHaveAttribute("data-pinned", "true");
  }
});
test("managed ids deduplicate; reload restores pinned identifiers without rewriting URL", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Pinning requires a desktop viewport");
  await page.goto(`${url}?instant`);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page.getByRole("button", { name: "Pin sheet", exact: true }).click();
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator('[data-sheet-id="one"]')).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("sheet-test")))
    .toContain('"id":"one"');
  await page.reload();
  await expect(page.locator('[data-sheet-id="one"]')).toHaveAttribute("data-pinned", "true");
  await expect(page).toHaveURL(`${url}/?instant`);
  await page.getByRole("button", { name: "Close sheet", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem("sheet-test")!).sheets))
    .toEqual([]);
});
test("typing in a sheet does not rerender neighboring content; keyboard pin ignores input", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Two visible sheets require desktop");
  await page.goto(`${url}?instant`);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page.getByRole("button", { name: "Open related" }).click();
  const initial = await page.locator('[data-renders="one"]').textContent();
  await page.getByRole("dialog", { name: "Project child" }).getByRole("textbox").fill("p");
  await expect(page.locator('[data-renders="one"]')).toHaveText(initial!);
  await expect(page.locator('[data-sheet-id="child"]')).not.toHaveAttribute("data-pinned");
});
test("sheet and close confirmation are accessible", async ({ page }) => {
  await page.goto(url);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  const results = await new AxeBuilder({ page }).include("[data-mendy-sheet-host]").analyze();
  expect(results.violations).toEqual([]);
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Draft");
  await page.keyboard.press("Escape");
  expect(
    (await new AxeBuilder({ page }).include('[role="alertdialog"]').analyze()).violations,
  ).toEqual([]);
});

test("start sheets restore their edge and size; closed restored instances reopen unpinned", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop persistence and pinning");
  await page.goto(`${url}?instant`);
  await page.evaluate(() =>
    sessionStorage.setItem(
      "sheet-test",
      JSON.stringify({
        version: 1,
        sheets: [{ id: "left", type: "project", payload: "left", side: "start", width: 360 }],
      }),
    ),
  );
  await page.reload();
  const left = page.locator('[data-sheet-id="left"]');
  await expect(left).toHaveAttribute("data-pinned", "true");
  expect((await left.boundingBox())!.x).toBe(0);
  expect((await left.boundingBox())!.width).toBe(360);
  await page.getByRole("button", { name: "Close sheet", exact: true }).click();
  await expect(left).toHaveCount(0);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await page.getByRole("button", { name: "Pin sheet", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Close sheet", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  await expect(page.locator('[data-sheet-id="one"]')).not.toHaveAttribute("data-pinned");
});
test("keyboard focus stays in the active sheet and P works only outside typing fields", async ({
  page,
  isMobile,
}) => {
  await page.goto(`${url}?instant`);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Project one" });
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);
  }
  if (!isMobile) {
    await dialog.getByRole("textbox").focus();
    await page.keyboard.press("p");
    await expect(dialog).not.toHaveAttribute("data-pinned");
    await dialog.getByRole("button", { name: "Save", exact: true }).focus();
    await page.keyboard.press("p");
    await expect(dialog).toHaveAttribute("data-pinned", "true");
  }
});
test("long body scrolls without moving header/footer and reduced motion disables opening animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${url}?long`);
  await page.getByRole("button", { name: "Open project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveCSS("animation-name", "none");
  const header = page.getByRole("heading", { name: "Project one" });
  const before = await header.boundingBox();
  await page.getByText("Detail 99", { exact: true }).scrollIntoViewIfNeeded();
  expect((await header.boundingBox())!.y).toBe(before!.y);
  const footer = await page.getByRole("button", { name: "Save", exact: true }).boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
});
