import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.goto("/docs/localization");
  await expect(page.getByTestId("locale-demo").getByRole("grid")).toBeVisible();
});

test("Hebrew defaults, portaled filters and switching language retain selection", async ({
  page,
  isMobile,
}) => {
  const demo = page.getByTestId("locale-demo");
  const activate = async (locator: ReturnType<typeof page.getByRole>) =>
    isMobile ? locator.tap() : locator.click();
  await expect(demo.getByRole("searchbox")).toHaveAttribute("placeholder", "חיפוש או סינון");
  await activate(demo.getByRole("button", { name: "פתיחת מסננים" }));
  const dialog = page.getByRole("dialog", { name: "מסננים", exact: true });
  await expect(dialog).toHaveAttribute("dir", "rtl");
  await activate(dialog.getByRole("button", { name: "מצב", exact: true }));
  await activate(dialog.getByRole("menuitemradio", { name: "פעיל", exact: true }));
  await page.keyboard.press("Escape");
  await expect(demo.getByRole("button", { name: "עריכת המסנן מצב" })).toBeVisible();
  await activate(demo.getByRole("button", { name: "English", exact: true }));
  await expect(demo.getByRole("grid")).toHaveAttribute("dir", "ltr");
  await expect(demo.getByRole("button", { name: "Edit Status filter" })).toContainText("Active");
  await expect(demo.getByRole("searchbox")).toHaveAttribute("placeholder", "Search or filter");
  await activate(demo.getByRole("button", { name: "עברית", exact: true }));
  await expect(demo.getByRole("button", { name: "עריכת המסנן מצב" })).toContainText("פעיל");
});

test("calendar and column settings localize including accessible drag instructions", async ({
  page,
  isMobile,
}) => {
  const demo = page.getByTestId("locale-demo");
  const activate = async (locator: ReturnType<typeof page.getByRole>) =>
    isMobile ? locator.tap() : locator.click();
  await activate(demo.getByRole("button", { name: "הגדרות עמודות" }));
  const settings = page.getByRole("dialog", { name: "הגדרות עמודות" });
  await expect(settings).toHaveAttribute("dir", "rtl");
  await expect(settings.getByRole("button", { name: "איפוס העמודות" })).toBeVisible();
  const handle = settings.getByRole("button", { name: "שינוי הסדר של מזהה" });
  const description = await handle.getAttribute("aria-describedby");
  await expect(page.locator(`[id="${description}"]`)).toContainText("רווח");
  await page.keyboard.press("Escape");
  await activate(demo.getByRole("button", { name: "פתיחת מסננים" }));
  const dialog = page.getByRole("dialog", { name: "מסננים", exact: true });
  await activate(dialog.getByRole("button", { name: "תאריך", exact: true }));
  await expect(dialog.getByRole("button", { name: "מעבר לחודש הבא" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "מעבר לחודש הקודם" })).toBeVisible();
  await expect(dialog.locator('[data-slot="calendar"]')).toHaveAttribute("lang", "he-IL");
  expect(
    (await new AxeBuilder({ page }).include('[data-slot="calendar"]').analyze()).violations,
  ).toEqual([]);
});

test("RTL table pins the first column on the right and follows visual arrow keys", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Pointer and desktop keyboard geometry");
  const grid = page.getByTestId("locale-demo").getByRole("grid");
  await expect(grid).toHaveAttribute("dir", "rtl");
  await grid.evaluate((el) => {
    el.style.width = "550px";
    el.scrollLeft = -200;
  });
  const cell = grid.locator('[data-row-id="P-1"][data-column-id="id"]');
  await expect
    .poll(async () => cell.evaluate((el) => getComputedStyle(el).position))
    .toBe("sticky");
  const bounds = await grid.boundingBox();
  expect(
    Math.abs(
      (await cell.boundingBox())!.x +
        (await cell.boundingBox())!.width -
        (bounds!.x + bounds!.width),
    ),
  ).toBeLessThan(20);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.body.dataset.copied = text;
        },
      },
    }),
  );
  await cell.click();
  await page.keyboard.press("Meta+c");
  await expect(page.getByTestId("locale-demo")).toContainText("התאים שנבחרו הועתקו");
  await expect(page.locator("body")).toHaveAttribute("data-copied", "P-1");
  await page.keyboard.press("ArrowLeft");
  await expect(grid.locator('[data-row-id="P-1"][data-column-id="name"]')).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cell).toBeFocused();
  const resize = grid.getByRole("separator", { name: "שינוי הרוחב של מזהה" });
  const before = Number(await resize.getAttribute("aria-valuenow"));
  await resize.focus();
  await resize.press("ArrowLeft");
  await expect(resize).toHaveAttribute("aria-valuenow", String(before + 10));
});
