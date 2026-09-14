import { expect } from "@playwright/test";

export async function defaultChecks(browser, check) {
  await check("Search-only bars omit redundant menu and clear-all controls", async () => {
    const page = await browser.newPage();
    try {
      for (const mode of ["zero-fields", "menu-hidden-fields"]) {
        await page.goto(`http://127.0.0.1:8790/?availability&${mode}`);
        const search = page.getByRole("searchbox", { name: "Search", exact: true });
        await expect(search).toBeVisible();
        await expect(page.getByRole("button", { name: "Open filters" })).toHaveCount(0);
        await search.fill("plain text");
        await expect(page.getByRole("button", { name: "Clear search" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
        await page.getByRole("button", { name: "Clear search" }).click();
        await expect(search).toBeFocused();
        await expect(search).toHaveValue("");
      }

      await page.goto("http://127.0.0.1:8790/?availability&zero-fields&standalone-menu");
      await expect(page.getByRole("button", { name: "Add filter", exact: true })).toHaveCount(0);

      await page.goto("http://127.0.0.1:8790/?availability&zero-fields&custom-clear");
      const customSearch = page.getByRole("searchbox", { name: "Search", exact: true });
      await customSearch.fill("plain text");
      await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
      const reset = page.getByRole("button", { name: "Reset view", exact: true });
      await expect(reset).toBeVisible();
      await reset.click();
      await expect(customSearch).toBeFocused();
      await expect(customSearch).toHaveValue("");
    } finally {
      await page.close();
    }
  });
  await check(
    "Menu-hidden recognized fields keep their chips and normal fields keep the menu",
    async () => {
      const page = await browser.newPage();
      try {
        await page.goto("http://127.0.0.1:8790/?availability&menu-hidden-fields");
        const search = page.getByRole("searchbox", { name: "Search", exact: true });
        await search.fill("ISSUE-123");
        await search.press("Enter");
        await expect(page.getByRole("button", { name: "Edit Identifier filter" })).toContainText(
          "ISSUE-123",
        );
        await expect(page.getByRole("button", { name: "Open filters" })).toHaveCount(0);
        const clear = page.getByRole("button", { name: "Clear all", exact: true });
        await expect(clear).toBeVisible();
        await clear.click();
        await expect(page.getByRole("button", { name: "Edit Identifier filter" })).toHaveCount(0);
        await expect(search).toBeFocused();

        await page.goto("http://127.0.0.1:8790/?availability");
        const menu = page.getByRole("button", { name: "Open filters", exact: true });
        await expect(menu).toBeVisible();
        await menu.click();
        await page.getByRole("button", { name: "Status", exact: true }).click();
        await page.getByRole("menuitemradio", { name: "Active", exact: true }).click();
        await expect(page.getByRole("button", { name: "Clear all", exact: true })).toBeVisible();

        await page.goto("http://127.0.0.1:8790/?availability&standalone-menu");
        const standalone = page.getByRole("button", { name: "Add filter", exact: true });
        await expect(standalone).toBeVisible();
        await standalone.click();
        await expect(page.getByRole("button", { name: "Status", exact: true })).toBeVisible();

        await page.goto("http://127.0.0.1:8790/?availability&dynamic-menu");
        const dynamicMenu = page.getByRole("button", { name: "Open filters", exact: true });
        const toggle = page.getByRole("button", { name: "Toggle menu fields", exact: true });
        await expect(dynamicMenu).toBeVisible();
        await dynamicMenu.click();
        await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toBeVisible();
        await toggle.evaluate((button) => button.click());
        await expect(dynamicMenu).toHaveCount(0);
        await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toHaveCount(0);
        const dynamicSearch = page.getByRole("searchbox", { name: "Search", exact: true });
        await dynamicSearch.fill("ISSUE-456");
        await dynamicSearch.press("Enter");
        await page.getByRole("button", { name: "Clear all", exact: true }).click();
        await expect(dynamicSearch).toBeFocused();
        await toggle.click();
        await expect(dynamicMenu).toBeVisible();
        await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toHaveCount(0);
        await dynamicMenu.click();
        await expect(page.getByRole("button", { name: "Status", exact: true })).toBeVisible();
      } finally {
        await page.close();
      }
    },
  );
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
