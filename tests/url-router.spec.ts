import { expect, test } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:8795" });
test("TanStack Router default parser preserves applied filter values", async ({ page }) => {
  await page.goto("/?consumer&issues&router");
  await page.getByRole("button", { name: "One city", exact: true }).click();
  await expect(page).toHaveURL(/city=/);
  await page.reload();
  await expect(page.locator("[data-values]")).toContainText('"city":["אופקים"]');
  await page.getByRole("button", { name: "Two cities", exact: true }).click();
  await expect(page).toHaveURL(/city=/);
  await expect(page.locator("[data-values]")).toContainText('"city":["אופקים","ירושלים"]');
  await page.getByRole("button", { name: "Range", exact: true }).click();
  await expect(page).toHaveURL(/range=/);
  await page.reload();
  await expect(page.locator("[data-values]")).toContainText('"range":[10,20]');
  await page.getByRole("button", { name: "JSON text", exact: true }).click();
  await expect(page).toHaveURL(/text=/);
  await page.reload();
  await expect(page.locator("[data-values]")).toContainText('"text":"[\\"literal\\"]"');
});
test("old JSON links, browser history, and clearing work with the default router parser", async ({
  page,
}) => {
  await page.goto(
    "/?consumer&issues&router&city=" +
      encodeURIComponent('["אופקים","ירושלים"]') +
      "&range=" +
      encodeURIComponent("[10,20]"),
  );
  const values = page.locator("[data-values]");
  await expect(values).toContainText('"city":["אופקים","ירושלים"]');
  await expect(values).toContainText('"range":[10,20]');
  await page.getByRole("button", { name: "One city", exact: true }).click();
  await expect(values).toContainText('"city":["אופקים"]');
  await expect(page).toHaveURL(/ui/);
  await page.goBack();
  await expect(values).toContainText('"city":["אופקים","ירושלים"]');
  await page.goForward();
  await expect(values).toContainText('"city":["אופקים"]');
  await page.getByRole("button", { name: "Clear fixture", exact: true }).click();
  await expect(page).not.toHaveURL(/city=/);
  await page.reload();
  await expect(values).toContainText('"city":null');
});
