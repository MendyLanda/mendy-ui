import { expect } from "@playwright/test";

export async function editorInteractionChecks(browser, check) {
  async function fixture(query = "fields=18&anchored") {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:8790/?${query}`);
    await page.getByRole("button", { name: "Open filters", exact: true }).click();
    await page
      .getByRole("group", { name: "Filter types", exact: true })
      .getByRole("button", { name: "Status", exact: true })
      .click();
    return { context, page };
  }
  await check(
    "Transparent space around anchored editors dismisses on the first click",
    async () => {
      for (const where of ["above", "below"]) {
        const { context, page } = await fixture();
        try {
          await page.getByRole("menuitemradio", { name: "Open", exact: true }).click();
          const editor = await page.locator('[data-slot="filter-menu-editor"]').boundingBox();
          const point = {
            x: editor.x + 100,
            y: where === "above" ? editor.y - 30 : editor.y + editor.height + 30,
          };
          // A table cell behind the popup must receive this first click, even when
          // it stops propagation as many interactive tables do.
          await page.evaluate(({ x, y }) => {
            const cell = document.createElement("button");
            cell.textContent = "Table cell";
            Object.assign(cell.style, {
              position: "fixed",
              left: `${x - 10}px`,
              top: `${y - 10}px`,
              width: "100px",
              height: "25px",
              zIndex: "1",
            });
            cell.onclick = (event) => {
              event.stopPropagation();
              cell.dataset.clicked = "true";
            };
            document.body.append(cell);
          }, point);
          await page.mouse.click(point.x, point.y);
          await expect(page.getByRole("dialog", { name: "Filters", exact: true })).toHaveCount(0);
          await expect(
            page.getByRole("button", { name: "Table cell", exact: true }),
          ).toHaveAttribute("data-clicked", "true");
          await expect(page.getByRole("button", { name: "Table cell", exact: true })).toBeFocused();
        } finally {
          await context.close();
        }
      }
    },
  );
  await check(
    "Single choices toggle off with click, Enter and Space without an invented Any option",
    async () => {
      for (const activation of ["click", "Enter", "Space"]) {
        const { context, page } = await fixture();
        try {
          const option = page.getByRole("menuitemradio", { name: "Open", exact: true });
          await option.focus();
          for (const selected of [true, false, true]) {
            if (activation === "click") await option.click();
            else await page.keyboard.press(activation);
            await expect(option).toHaveAttribute("aria-checked", String(selected));
            await expect(option).toBeFocused();
          }
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: "Edit Status filter", exact: true }).click();
          await expect(page.getByRole("menuitemradio")).toHaveCount(2);
          await page.getByRole("menuitemradio", { name: "Open", exact: true }).click();
          await expect(
            page.getByRole("button", { name: "Edit Status filter", exact: true }),
          ).toHaveCount(0);
          await expect(page.locator('[data-slot="filter-editor-content"]')).toHaveCount(0);
        } finally {
          await context.close();
        }
      }
    },
  );
  await check("Required choices keep their selection when activated again", async () => {
    const { context, page } = await fixture("required&anchored");
    try {
      const option = page.getByRole("menuitemradio", { name: "Open", exact: true });
      await option.click();
      await option.click();
      await expect(option).toHaveAttribute("aria-checked", "true");
    } finally {
      await context.close();
    }
  });
  await check(
    "Chip editors open without animation by default, with an explicit opt-in",
    async () => {
      for (const animate of [false, true]) {
        const { context, page } = await fixture("anchored" + (animate ? "&animate-editor" : ""));
        try {
          await page.getByRole("menuitemradio", { name: "Open", exact: true }).click();
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: "Edit Status filter", exact: true }).click();
          const editor = page.locator('[data-slot="filter-editor-content"]');
          if (animate) await expect(editor).not.toHaveCSS("animation-name", "none");
          else await expect(editor).toHaveCSS("animation-name", "none");
        } finally {
          await context.close();
        }
      }
    },
  );
}
