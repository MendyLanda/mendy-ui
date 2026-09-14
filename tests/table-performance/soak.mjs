import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const cdp = await page.context().newCDPSession(page);
const results = {};
try {
  await page.goto("http://127.0.0.1:8796/?rows=100000&columns=100");
  await page.getByRole("gridcell").first().waitFor();
  results.copy = await page.evaluate(() => {
    const table = window.table;
    table.selectCellRange({
      anchorRowId: "0",
      anchorColumnId: "column-1",
      focusRowId: "4999",
      focusColumnId: "column-3",
    });
    const start = performance.now();
    const text = window.copySelection();
    return { ms: performance.now() - start, bytes: text.length, lines: text.split("\n").length };
  });
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.table.resetCellSelection(true));
  const memory = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    return (await cdp.send("Runtime.getHeapUsage")).usedSize;
  };
  results.memory = [await memory()];
  const rounds = Number(process.env.SOAK_ROUNDS ?? 3);
  const frames = Number(process.env.SOAK_FRAMES ?? 600);
  const rate = Number(process.env.CPU_RATE ?? 4);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  results.cpuRate = rate;
  results.rounds = [];
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.start");
  for (let round = 0; round < rounds; round++) {
    results.rounds.push(
      await page.evaluate(
        async ({ frames, round }) => {
          const grid = document.querySelector('[role="grid"]');
          const times = [];
          let previous = await new Promise(requestAnimationFrame);
          for (let i = 0; i < frames; i++) {
            grid.scrollTop = (((i + round * frames) * 10) % 90000) * 44;
            grid.scrollLeft = (i % 100) * 100;
            grid.style.width = `${900 + (i % 20) * 10}px`;
            const now = await new Promise(requestAnimationFrame);
            times.push(now - previous);
            previous = now;
          }
          times.sort((a, b) => a - b);
          return {
            frames,
            p95: times[Math.floor(times.length * 0.95)],
            max: times.at(-1),
            cells: document.querySelectorAll('[role="gridcell"]').length,
          };
        },
        { frames, round },
      ),
    );
    results.memory.push(await memory());
    console.log(
      JSON.stringify({ round, ...results.rounds.at(-1), heapMB: results.memory.at(-1) / 1048576 }),
    );
  }
  const { profile } = await cdp.send("Profiler.stop");
  await writeFile("/tmp/table-soak.cpuprofile", JSON.stringify(profile));
  console.log(JSON.stringify(results, null, 2));
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
