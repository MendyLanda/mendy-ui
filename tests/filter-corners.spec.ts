import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://127.0.0.1:8795" });

for (const dir of ["ltr", "rtl"]) {
  test(`${dir} editor rounds exposed corners and squares only actual joins`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Adjacent panels are desktop only");
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`/?consumer&corners&dir=${dir}`);
    await page.addStyleTag({ content: ":root { --radius: 22px; }" });
    await page
      .getByRole("button", { name: dir === "ltr" ? "Open filters" : "פתיחת מסננים", exact: true })
      .click();
    const list = page.locator('[data-slot="filter-menu-list"]');
    const editor = page.locator('[data-slot="filter-menu-editor"]');
    const radii = () =>
      editor.evaluate((el) => {
        const css = getComputedStyle(el);
        return [parseFloat(css.borderStartStartRadius), parseFloat(css.borderEndStartRadius)];
      });
    await list.getByRole("button", { name: "Choice 1", exact: true }).click();
    await expect.poll(radii).toEqual([20, 20]);
    await list.getByRole("button", { name: "Choice 5", exact: true }).click();
    await expect.poll(radii).toEqual([0, 0]);
    await list.getByRole("button", { name: "מצב הפרויקט", exact: true }).click();
    await expect.poll(radii).toEqual([0, 20]);
    // Filtering a tall editor makes its bottom corner join the list again.
    await list.getByRole("button", { name: "Choice 1", exact: true }).click();
    await editor.getByRole("searchbox").fill("Option 20");
    await expect.poll(radii).toEqual([20, 0]);
  });
}
