import { expect } from "@playwright/test";

export async function chipChecks(browser, check) {
  async function fixture(width = 1280, query = "") {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:8790/?chip-regressions" + query);
    return { context, page };
  }
  await check(
    "Pending external labels never expose IDs, including custom summaries and descriptions",
    async () => {
      const { context, page } = await fixture();
      try {
        for (const name of ["Owner", "Custom"]) {
          const chip = page.getByRole("button", { name: `Edit ${name} filter`, exact: true });
          await expect(chip).not.toContainText("person-12345");
          await expect(chip).toHaveAccessibleDescription("Loading selected values");
          await expect(chip).toHaveAttribute("aria-busy", "true");
        }
        await expect(
          page.getByRole("button", { name: "Edit Identifier filter", exact: true }),
        ).toContainText("raw-123");
        await page.getByRole("button", { name: "ready", exact: true }).click();
        for (const name of ["Owner", "Custom"])
          await expect(
            page.getByRole("button", { name: `Edit ${name} filter`, exact: true }),
          ).toContainText("Ada Lovelace");
        await page.getByRole("button", { name: "refetch", exact: true }).click();
        for (const name of ["Owner", "Custom"]) {
          const chip = page.getByRole("button", { name: `Edit ${name} filter`, exact: true });
          await expect(chip).toContainText("Ada Lovelace");
          await expect(chip).not.toHaveAttribute("aria-busy", "true");
        }
      } finally {
        await context.close();
      }
    },
  );
  await check(
    "Remote resolution stays pending until success, failure, or a confirmed missing value",
    async () => {
      for (const phase of ["ready", "error", "missing"]) {
        const { context, page } = await fixture(1280, "&remote-labels");
        try {
          const chip = page.getByRole("button", { name: "Edit Owner filter", exact: true });
          await expect(chip).not.toContainText("person-12345");
          await expect(chip).toHaveAttribute("aria-busy", "true");
          await page.getByRole("button", { name: phase, exact: true }).click();
          await expect(chip).not.toHaveAttribute("aria-busy", "true");
          await expect(chip).toContainText(phase === "ready" ? "Ada Lovelace" : "person-12345");
        } finally {
          await context.close();
        }
      }
    },
  );
  await check("Missing or failed labels settle; retry restores the loading state", async () => {
    for (const phase of ["error", "missing"]) {
      const { context, page } = await fixture();
      try {
        await page.getByRole("button", { name: phase, exact: true }).click();
        const chip = page.getByRole("button", { name: "Edit Owner filter", exact: true });
        await expect(chip).toContainText("person-12345");
        await expect(chip).not.toHaveAttribute("aria-busy", "true");
        await page.getByRole("button", { name: "loading", exact: true }).click();
        await expect(chip).not.toContainText("person-12345");
      } finally {
        await context.close();
      }
    }
  });
  await check(
    "Chip editors hand off without outgoing focus restoration, and Escape still returns focus",
    async () => {
      const { context, page } = await fixture();
      try {
        await page.getByRole("button", { name: "ready", exact: true }).click();
        for (let i = 0; i < 3; i++) {
          await page.getByRole("button", { name: "Edit Status filter", exact: true }).click();
          await page.getByRole("button", { name: "Edit Custom filter", exact: true }).click();
          await expect(page.getByRole("textbox", { name: "Custom search" })).toBeFocused();
          // Radix schedules the outgoing focus restoration after unmount.
          await page.waitForTimeout(150);
          await expect(page.getByRole("textbox", { name: "Custom search" })).toBeFocused();
          await page.keyboard.press("Escape");
          await expect(
            page.getByRole("button", { name: "Edit Custom filter", exact: true }),
          ).toBeFocused();
          await expect(page.locator('[data-slot="filter-editor-content"]')).toHaveCount(0);
        }
        await page.getByRole("button", { name: "Edit Owner filter", exact: true }).click();
        await page.getByRole("button", { name: "Edit Custom filter", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("textbox", { name: "Custom search" })).toBeFocused();
        await page.getByRole("button", { name: "ready", exact: true }).click();
        await expect(page.locator('[data-slot="filter-editor-content"]')).toHaveCount(0);
        await expect(page.getByRole("button", { name: "ready", exact: true })).toBeFocused();
      } finally {
        await context.close();
      }
    },
  );
  await check("Custom chip editor shares the menu width and fits a narrow viewport", async () => {
    for (const width of [1280, 320]) {
      const { context, page } = await fixture(width);
      try {
        await page.getByRole("button", { name: "Edit Custom filter", exact: true }).click();
        const editor = page.locator('[data-slot="filter-editor-content"]');
        await expect
          .poll(async () => Math.round((await editor.boundingBox())?.width ?? 0))
          .toBe(Math.min(304, width - 32));
        const chip = await editor.boundingBox();
        expect(chip.width).toBeLessThanOrEqual(width - 32);
        expect(chip.width).toBeGreaterThanOrEqual(Math.min(304, width - 32) - 0.1);
        await page.keyboard.press("Escape");
        if (width > 640) {
          await page.getByRole("button", { name: "Open filters", exact: true }).click();
          await page
            .getByRole("group", { name: "Filter types", exact: true })
            .getByRole("button", { name: "Custom", exact: true })
            .click();
          const menu = await page.locator('[data-slot="filter-menu-editor"]').boundingBox();
          expect(Math.abs(chip.width - menu.width)).toBeLessThanOrEqual(2);
        }
      } finally {
        await context.close();
      }
    }
  });
  await check("A theme width override reaches both chip and menu editors", async () => {
    const { context, page } = await fixture();
    try {
      await page.evaluate(() =>
        document.documentElement.style.setProperty("--mendy-filter-editor-width", "380px"),
      );
      await page.getByRole("button", { name: "Edit Custom filter", exact: true }).click();
      await expect(page.locator('[data-slot="filter-editor-content"]')).toHaveCSS("width", "380px");
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Open filters", exact: true }).click();
      await page
        .getByRole("group", { name: "Filter types", exact: true })
        .getByRole("button", { name: "Custom", exact: true })
        .click();
      await expect
        .poll(
          async () => (await page.locator('[data-slot="filter-menu-editor"]').boundingBox()).width,
        )
        .toBeGreaterThanOrEqual(380);
    } finally {
      await context.close();
    }
  });
}
