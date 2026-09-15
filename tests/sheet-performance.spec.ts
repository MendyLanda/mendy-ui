import { expect, test } from "@playwright/test";

test("sheet content stays idle during viewport resize with a deep stack", async ({
  page,
}, testInfo) => {
  await page.goto("http://127.0.0.1:8797/?instant&stress");
  await page.waitForFunction(() => Boolean(window.sheetStress));
  for (let i = 0; i < 24; i++) {
    await page.evaluate((id) => window.sheetStress.open(id), `stress-${i}`);
  }
  await expect(page.locator('[role="dialog"]')).toHaveCount(24);
  const before = await page.evaluate(() => window.sheetStress.counts());
  const started = performance.now();
  for (let i = 0; i < 20; i++) {
    await page.setViewportSize({ width: 400 + (i % 2) * 160, height: 800 });
  }
  const after = await page.evaluate(() => window.sheetStress.counts());
  await testInfo.attach("resize-profile", {
    body: JSON.stringify({ milliseconds: performance.now() - started, before, after }),
    contentType: "application/json",
  });
  expect(after).toEqual(before);
  await expect(page.locator('[role="dialog"]:not([aria-hidden=true])')).toHaveCount(1);
});

test("repeated managed stacks release their DOM and preserve input without neighbor renders", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("http://127.0.0.1:8797/?instant&stress");
  await page.waitForFunction(() => Boolean(window.sheetStress));
  const durations: number[] = [];
  const baseline = await page.locator("*").count();
  for (let cycle = 0; cycle < 20; cycle++) {
    const started = performance.now();
    for (let i = 0; i < 10; i++)
      await page.evaluate((id) => window.sheetStress.open(id), `cycle-${i}`);
    await expect(page.locator('[role="dialog"]')).toHaveCount(10);
    const before = await page.evaluate(() => window.sheetStress.counts());
    await page.locator('[role="dialog"]').last().locator("input").first().fill(`draft-${cycle}`);
    expect(await page.evaluate(() => window.sheetStress.counts())).toEqual(before);
    for (let i = 9; i >= 0; i--)
      await page.evaluate((id) => window.sheetStress.close(id), `cycle-${i}`);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(page.locator("[data-mendy-sheet-overlay]")).toHaveCount(0);
    expect(await page.locator("*").count()).toBe(baseline);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    durations.push(performance.now() - started);
  }
  await testInfo.attach("stack-cycles", {
    body: JSON.stringify({ cycles: 20, sheetsPerCycle: 10, fieldsPerSheet: 100, durations }),
    contentType: "application/json",
  });
});

test("CPU-throttled sheet churn releases listeners, DOM and heap", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium" || testInfo.project.name !== "desktop",
    "CDP measurements require desktop Chromium",
  );
  test.setTimeout(120_000);
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Performance.enable");
  await page.goto("http://127.0.0.1:8797/?instant&stress");
  await page.waitForFunction(() => Boolean(window.sheetStress));
  async function cycle() {
    for (let i = 0; i < 3; i++) {
      await page.evaluate((id) => window.sheetStress.open(id), `churn-${i}`);
      await expect(page.locator('[role="dialog"]')).toHaveCount(i + 1);
    }
    await page.evaluate(() => window.sheetStress.pin("churn-2"));
    await expect(page.locator("[data-pinned=true]")).toHaveCount(1);
    await page.evaluate(() => window.sheetStress.unpin("churn-2"));
    for (let i = 2; i >= 0; i--)
      await page.evaluate((id) => window.sheetStress.close(id), `churn-${i}`);
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  }
  async function measure() {
    // Radix restores focus after unmount. Measure settled lifetime, not its pending task.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await session.send("HeapProfiler.collectGarbage");
    const dom = await session.send("Memory.getDOMCounters");
    const { metrics } = await session.send("Performance.getMetrics");
    return { ...dom, heap: metrics.find((metric) => metric.name === "JSHeapUsedSize")!.value };
  }
  for (let i = 0; i < 3; i++) await cycle();
  const before = await measure();
  const durations: number[] = [];
  for (let i = 0; i < 50; i++) {
    const started = performance.now();
    await cycle();
    durations.push(performance.now() - started);
  }
  const after = await measure();
  const report = {
    cpuSlowdown: 4,
    cycles: 50,
    before,
    after,
    medianCycleMs: durations.toSorted((a, b) => a - b)[25],
  };
  console.log("Sheet churn profile", JSON.stringify(report));
  await testInfo.attach("heap-profile", {
    body: JSON.stringify(report),
    contentType: "application/json",
  });
  expect(after.nodes).toBeLessThanOrEqual(before.nodes + 10);
  expect(after.jsEventListeners).toBeLessThanOrEqual(before.jsEventListeners + 5);
  expect(after.heap - before.heap).toBeLessThan(5_000_000);
});
