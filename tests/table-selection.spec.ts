import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { copiedText: "" });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => Object.assign(window, { copiedText: text }),
      },
    });
  });
  await page.goto("http://127.0.0.1:8796/?rows=10000&columns=30");
  await page.setViewportSize({ width: 1200, height: 800 });
});

test("copy survives scrolling the focused selection out of the viewport and back", async ({
  page,
}) => {
  await page.locator('[data-row-id="0"][data-column-id="column-1"]').click();
  for (let i = 0; i < 40; i++) await page.keyboard.press("Shift+ArrowDown");
  const grid = page.getByRole("grid");
  await grid.evaluate((element) => {
    element.scrollTop = 44000;
  });
  await expect(page.locator('[data-row-id="1000"][data-column-id="column-1"]')).toBeVisible();
  await grid.evaluate((element) => {
    element.scrollTop = 0;
  });
  await expect(page.locator('[data-row-id="0"][data-column-id="column-1"]')).toBeVisible();
  await page.keyboard.press("Meta+c");
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { copiedText: string }).copiedText))
    .toBe(Array.from({ length: 41 }, (_, i) => String(i + 1)).join("\n"));
});

test("a selected cell does not add a second focus outline inside its range", async ({ page }) => {
  await page.locator('[data-row-id="0"][data-column-id="column-1"]').click();
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.locator('[role="gridcell"]:focus')).toHaveCSS("outline-style", "none");
});

test("selection hidden behind pinned cells does not bleed through row borders", async ({
  page,
}) => {
  await page.evaluate(() => {
    document
      .querySelector<HTMLElement>("[data-mendy-ui]")!
      .style.setProperty("--primary", "#2563eb");
  });
  await page.locator('[data-row-id="0"][data-column-id="column-1"]').click();
  for (let i = 0; i < 8; i++) await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Shift+ArrowRight");
  const grid = page.getByRole("grid");
  await grid.evaluate((element) => {
    element.scrollLeft = 100;
  });
  const box = await grid.boundingBox();
  const pinned = await page.locator('[data-row-id="1"][data-column-id="column-0"]').boundingBox();
  const screenshot = await grid.screenshot({ scale: "css" });
  const blue = await page.evaluate(
    async ({ image, x, y, width, rowHeight }) => {
      const bitmap = await createImageBitmap(await (await fetch(image)).blob());
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      let count = 0;
      // Inspect the row seams where strokes can leak. Scanning text too picks
      // up blue font-antialiasing fringes on some Linux browser configurations.
      for (let row = 1; row <= 5; row++) {
        const pixels = context.getImageData(x, Math.round(y + row * rowHeight - 2), width, 4).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 2] > 180 && pixels[i] < 100 && pixels[i + 1] < 150) count++;
        }
      }
      return count;
    },
    {
      image: `data:image/png;base64,${screenshot.toString("base64")}`,
      x: Math.round(pinned!.x - box!.x + 5),
      y: Math.round(pinned!.y - box!.y),
      width: Math.floor(pinned!.width - 12),
      rowHeight: pinned!.height,
    },
  );
  expect(blue).toBe(0);
});

test("copy only visits selected cells, respecting holes, pin order and disabled cells", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { table, copySelection } =
      window as unknown as import("./table-performance/types").PerformanceHarnessWindow;
    table.setColumnPinning({ start: ["column-2"], end: ["column-0"] });
    table.selectCellRange({
      anchorRowId: "0",
      anchorColumnId: "column-2",
      focusRowId: "2",
      focusColumnId: "column-1",
    });
    table.selectCellRange(
      { anchorRowId: "1", anchorColumnId: "column-1", focusRowId: "1", focusColumnId: "column-1" },
      { mode: "exclude" },
    );
    Object.assign(table.getColumn("column-2")!.columnDef, {
      copyValue: (row: { value: number }) => `value\t${row.value}`,
    });
    const withHole = copySelection();
    table.getColumn("column-1")!.columnDef.enableCellSelection = false;
    for (const row of table.getRowsInDisplayOrder()) {
      row.getAllCells = () => {
        throw new Error("Copy materialized unrelated columns");
      };
      row.getAllCellsByColumnId = () => {
        throw new Error("Copy materialized unrelated columns");
      };
    }
    return { withHole, disabled: copySelection() };
  });
  expect(result.withHole).toBe('"value\t0"\t1\n"value\t1"\t\n"value\t2"\t3');
  expect(result.disabled).toBe('"value\t0"\n"value\t1"\n"value\t2"');
});

test("scrolling selection does not steal focus from another control", async ({ page }) => {
  await page.locator('[data-row-id="0"][data-column-id="column-1"]').click();
  const button = page.getByRole("button", { name: "Update parent" });
  await button.focus();
  await page.getByRole("grid").evaluate((el) => {
    el.scrollTop = 44000;
  });
  await expect(page.locator('[data-row-id="1000"][data-column-id="column-1"]')).toBeVisible();
  await expect(button).toBeFocused();
});

for (const theme of ["light", "dark"]) {
  for (const highlighted of [false, true]) {
    test(`copy feedback overrides hover and highlighted rows (${theme}, highlighted=${highlighted})`, async ({
      page,
    }) => {
      await page.goto(
        `http://127.0.0.1:8796/?rows=100&columns=6${highlighted ? "&highlight" : ""}`,
      );
      await page.evaluate(
        (dark) => document.documentElement.classList.toggle("dark", dark),
        theme === "dark",
      );
      await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
      const first = page.locator('[data-row-id="0"][data-column-id="column-0"]');
      const second = page.locator('[data-row-id="1"][data-column-id="column-0"]');
      const unselected = page.locator('[data-row-id="0"][data-column-id="column-2"]');
      await first.click();
      await page.keyboard.press("Shift+ArrowDown");
      await page.keyboard.press("Shift+ArrowRight");
      await page.mouse.move(1100, 750);
      await page.clock.pauseAt(new Date("2026-01-02T00:00:00Z"));
      await page.keyboard.press("Meta+c");
      await expect(page.getByText("Selected cells copied", { exact: true })).toBeAttached();
      const green = await second.evaluate((el) => getComputedStyle(el).backgroundColor);
      await first.hover();
      await expect(first).toHaveCSS("background-color", green);
      await expect(page.locator('[data-row-id="0"][data-column-id="column-1"]')).toHaveCSS(
        "background-color",
        green,
      );
      await expect(unselected).not.toHaveCSS("background-color", green);
      await page.clock.runFor(350);
      await expect(first).not.toHaveCSS("background-color", green);
    });
  }
}

test("incremental loading shows a spinner beside its status text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("http://127.0.0.1:8796/?rows=10&columns=6&loading");
  const status = page.getByRole("status").filter({ hasText: "Loading more" });
  await expect(status).toBeVisible();
  const spinner = status.locator('svg[aria-hidden="true"]');
  await expect(spinner).toBeVisible();
  await expect(spinner).toHaveCSS("animation-iteration-count", "infinite");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(spinner).toHaveCSS("animation-name", "none");
});
