import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const results = [];
const columns = Number(process.env.BENCH_COLUMNS ?? 100);
try {
  for (const rows of [10000, 100000]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const started = performance.now();
    await page.goto(`http://127.0.0.1:8796/?rows=${rows}&columns=${columns}`);
    await page.getByRole("gridcell").first().waitFor();
    const mount = performance.now() - started;
    const sample = async (action) => {
      await page.evaluate(() => {
        window.metrics.renders = 0;
      });
      const begin = performance.now();
      await action();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      return {
        ms: Math.round(performance.now() - begin),
        renders: await page.evaluate(() => window.metrics.renders),
      };
    };
    const parent = await sample(() => page.getByText("Update parent", { exact: true }).click());
    const resize = await sample(() => page.setViewportSize({ width: 1100, height: 800 }));
    const scroll = await sample(() =>
      page.getByRole("grid").evaluate((el) => {
        el.scrollTop = 44000;
      }),
    );
    const cells = await page.getByRole("gridcell").count();
    const continuous = await page.evaluate(async () => {
      const grid = document.querySelector('[role="grid"]');
      const frames = [];
      const frame = () => new Promise(requestAnimationFrame);
      let previous = await frame();
      for (let i = 0; i < 120; i++) {
        grid.scrollTop = 44000 + i * 120;
        grid.scrollLeft = i * 80;
        grid.style.width = `${900 + (i % 20) * 10}px`;
        const now = await frame();
        frames.push(now - previous);
        previous = now;
      }
      frames.sort((a, b) => a - b);
      return {
        p95FrameMs: Math.round(frames[Math.floor(frames.length * 0.95)]),
        maxFrameMs: Math.round(frames.at(-1)),
      };
    });
    results.push({
      rows,
      columns,
      mount: Math.round(mount),
      parent,
      resize,
      scroll,
      cells,
      continuous,
    });
    await page.close();
  }
  console.log(JSON.stringify(results, null, 2));
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(results, null, 2));
  if (process.env.ASSERT_BUDGET && results.some((r) => r.cells > 600))
    throw Error("Offscreen columns exceeded the 600 mounted-cell budget");
} finally {
  await browser.close();
}
