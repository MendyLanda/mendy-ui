import { expect } from "@playwright/test";

export async function defaultChecks(browser, check) {
  await check(
    "Standalone single-choice defaults keep the editor open and toggle with Enter",
    async () => {
      const page = await browser.newPage();
      try {
        for (const query of ["", "&required", "&close-on-select"]) {
          await page.goto("http://127.0.0.1:8790/?standalone" + query);
          await page.getByRole("button", { name: "Edit Stage filter" }).click();
          await expect(page.getByRole("searchbox", { name: "Stage", exact: true })).toBeFocused();
          const choice = page.getByRole("menuitemradio", { name: "Ready", exact: true });
          await choice.click();
          await expect(page.locator("#selection")).toHaveText("ready");
          if (query.includes("close-on-select")) {
            await expect(choice).toHaveCount(0);
          } else {
            await expect(choice).toBeFocused();
            await page.keyboard.press("Enter");
            await expect(page.locator("#selection")).toHaveText(
              query.includes("required") ? "ready" : "",
            );
            await expect(choice).toBeVisible();
          }
        }
      } finally {
        await page.close();
      }
    },
  );
  await check(
    "Composed lists include one Clear all by default and support opting out",
    async () => {
      const page = await browser.newPage();
      try {
        await page.goto("http://127.0.0.1:8790/?composed&active=2");
        const clear = page.getByRole("button", { name: "Clear all", exact: true });
        await expect(clear).toHaveCount(1);
        await expect(
          page.getByRole("button", { name: "Edit Assignee filter" }).locator('[title="Assignee"]'),
        ).toHaveCount(0);
        await page.getByRole("searchbox", { name: "Search", exact: true }).fill("draft");
        await clear.click();
        await expect(clear).toHaveCount(0);
        await expect(page.getByRole("searchbox", { name: "Search", exact: true })).toHaveValue("");
        await expect(page.locator("#values")).toContainText('"people":null');
        await page.goto("http://127.0.0.1:8790/?composed&active=2&no-clear");
        await expect(clear).toHaveCount(0);
      } finally {
        await page.close();
      }
    },
  );
}
