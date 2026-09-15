import { expect, test } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:8795" });
for (const dir of ["ltr", "rtl"])
  for (const mode of ["empty", "error"]) {
    test(`${dir} ${mode} feedback stays centered in the visible viewport`, async ({ page }) => {
      await page.goto(`/?consumer&issues&dir=${dir}&mode=${mode}`);
      const grid = page.getByRole("grid");
      const feedback = grid.getByRole(mode === "error" ? "alert" : "status");
      for (const scroll of [0, 300, 900]) {
        await grid.evaluate(
          (el, x) => {
            el.scrollLeft = x;
          },
          dir === "rtl" ? -scroll : scroll,
        );
        await expect
          .poll(async () =>
            feedback.evaluate((el) => {
              const g = el.closest('[role="grid"]')!;
              const v = g.getBoundingClientRect();
              const header = g.querySelector('[aria-rowindex="1"]')!.getBoundingClientRect();
              const r = el.getBoundingClientRect();
              return {
                x: Math.round(r.left + r.width / 2 - (v.left + g.clientLeft + g.clientWidth / 2)),
                y: Math.round(
                  r.top + r.height / 2 - (header.bottom + (g.clientHeight - header.height) / 2),
                ),
              };
            }),
          )
          .toEqual({ x: expect.closeTo(0, 0), y: expect.closeTo(0, 0) });
      }
    });
  }
test("settings omit fixed utility columns", async ({ page }) => {
  await page.goto("/?consumer&issues");
  await page.getByRole("button", { name: "הגדרות עמודות", exact: true }).click();
  await expect(page.locator('[data-column-setting="_selection"]')).toHaveCount(0);
  await expect(page.locator('[data-column-setting="actions"]')).toHaveCount(0);
  await expect(page.locator("[data-column-setting]")).toHaveCount(2);
});
test("selection cell padding toggles the row without opening it", async ({ page }) => {
  await page.goto("/?consumer&issues");
  const cell = page.getByRole("gridcell").filter({ has: page.getByRole("checkbox") });
  const check = cell.getByRole("checkbox");
  await cell.click({ position: { x: 3, y: 10 } });
  await expect(check).toBeChecked();
  await cell.click({ position: { x: 3, y: 10 } });
  await expect(check).not.toBeChecked();
  await expect(page.locator("[data-opened]")).toHaveText("0");
});
test("selection checkbox describes the record instead of its internal id", async ({ page }) => {
  await page.goto("/?consumer&issues");
  await expect(page.getByRole("gridcell").getByRole("checkbox")).toHaveAccessibleName(
    "בחירת שורה תשלום עבור אוגוסט",
  );
});
for (const inline of [false, true]) {
  test(`custom record label works with ${inline ? "inline" : "dedicated"} selection`, async ({
    page,
  }) => {
    await page.goto(`/?consumer&issues&label${inline ? "&inline" : ""}`);
    await expect(page.getByRole("gridcell").getByRole("checkbox")).toHaveAccessibleName(
      "בחירת שורה תשלום: תשלום עבור אוגוסט",
    );
  });
}
test("selection padding supports keyboard and disabled rows without row activation", async ({
  page,
}) => {
  await page.goto("/?consumer&issues");
  const cell = page.getByRole("gridcell").filter({ has: page.getByRole("checkbox") });
  const check = cell.getByRole("checkbox");
  await cell.focus();
  await cell.press("Space");
  await expect(check).toBeChecked();
  await cell.press("Enter");
  await expect(check).not.toBeChecked();
  await cell.dblclick({ position: { x: 3, y: 10 } });
  await expect(page.locator("[data-opened]")).toHaveText("0");
  await page.getByRole("gridcell").filter({ hasText: "תשלום עבור אוגוסט" }).click();
  await expect(page.locator("[data-opened]")).toHaveText("1");
  await page.goto("/?consumer&issues&disabled");
  await cell.click({ position: { x: 3, y: 10 } });
  await expect(check).not.toBeChecked();
  await expect(page.locator("[data-opened]")).toHaveText("0");
});
test("compact fill feedback does not introduce a vertical scrollbar", async ({ page }) => {
  await page.goto("/?consumer&issues&mode=empty");
  await page.addStyleTag({
    content: '[data-slot="data-table"]{height:240px!important;min-height:240px!important}',
  });
  await expect
    .poll(() => page.getByRole("grid").evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBe(0);
});
