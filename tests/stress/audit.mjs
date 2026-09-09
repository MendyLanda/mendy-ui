import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const phase = process.argv[2] ?? "after";
const root = process.env.STRESS_OUTPUT ?? "artifacts/ui-polish/design-stress";
const origin = process.env.STRESS_URL ?? "http://127.0.0.1:8790";
await mkdir(root, { recursive: true });
const browser = await chromium.launch();
const report = { phase, cases: [], performance: [] };
const cases = [
  { id: "font-640", width: 640, font: 32, field: "Created date" },
  { id: "font-1280", width: 1280, font: 32, field: "Created date" },
  { id: "desktop-options", width: 1280 },
  { id: "dark-options", width: 1280, theme: "dark" },
  { id: "phone-options", width: 320, mobile: true },
  { id: "phone-dark", width: 390, mobile: true, theme: "dark" },
  { id: "desktop-date", width: 1280, field: "Created date" },
  { id: "phone-date", width: 320, mobile: true, field: "Created date" },
  { id: "text", width: 1280, field: "Title" },
  { id: "number", width: 1280, field: "Estimate" },
  { id: "long-desktop", width: 1280, long: true, active: 1 },
  { id: "long-phone", width: 320, mobile: true, long: true, active: 1 },
  { id: "narrow-container", width: 1280, container: 260 },
  { id: "breakpoint", width: 640 },
  { id: "square-dark", width: 1280, theme: "dark", radius: "0px" },
  { id: "rtl", width: 1280, rtl: true },
  { id: "short-viewport", width: 640, height: 360 },
  { id: "many-filters", width: 1280, fields: 1000 },
  { id: "many-selected", width: 320, mobile: true, options: 1000, active: 1000 },
];
for (const c of process.argv.includes("--performance") ? [] : cases) {
  const context = await browser.newContext({
    viewport: { width: c.width, height: c.height ?? 900 },
    deviceScaleFactor: 1,
    isMobile: !!c.mobile,
    hasTouch: !!c.mobile,
    locale: "en-US",
    timezoneId: "UTC",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.setFixedTime(new Date("2026-09-09T12:00:00Z"));
  await page.goto(
    origin +
      "/?" +
      new URLSearchParams(
        Object.entries(c).filter(([k]) =>
          [
            "theme",
            "long",
            "active",
            "container",
            "fields",
            "options",
            "radius",
            "rtl",
            "font",
          ].includes(k),
        ),
      ),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  if (c.field) await page.getByRole("button", { name: c.field, exact: true }).click();
  else if (c.mobile) await page.locator('[aria-label="Filter types"] button').first().click();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(80);
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector('[data-slot="filter-menu-panel"]');
    const types = document.querySelector('[aria-label="Filter types"]');
    const dims = (e) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        scrollWidth: e.scrollWidth,
        clientWidth: e.clientWidth,
        scrollHeight: e.scrollHeight,
        clientHeight: e.clientHeight,
      };
    };
    const rows = [...(types?.querySelectorAll("button") ?? [])].slice(0, 6).map((e) => {
      const b = e.getBoundingClientRect();
      const label = e.querySelector("[title]");
      const range = document.createRange();
      range.selectNodeContents(label);
      const t = range.getBoundingClientRect();
      return {
        label: e.getAttribute("aria-label"),
        height: b.height,
        textCenterOffset: t.y + t.height / 2 - b.y - b.height / 2,
      };
    });
    return {
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      calendarBalance: (() => {
        const calendar = panel.querySelector('[data-slot="calendar"]');
        if (!calendar) return null;
        const c = calendar.getBoundingClientRect();
        const parent = calendar.parentElement.getBoundingClientRect();
        return c.left - parent.left - (parent.right - c.right);
      })(),
      numberLabelInset: (() => {
        const label = panel.querySelector("fieldset label");
        const heading = panel.querySelector("[data-more-below]");
        return label && heading
          ? label.getBoundingClientRect().left - heading.getBoundingClientRect().left
          : null;
      })(),
      panel: dims(panel),
      types: types && dims(types),
      rows,
      clipped: [...panel.querySelectorAll('input,[role^="menuitem"],legend')]
        .filter((e) => getComputedStyle(e).clip === "auto" && e.scrollWidth > e.clientWidth + 1)
        .map((e) => ({
          role: e.getAttribute("role"),
          text: e.textContent?.slice(0, 50),
          ...dims(e),
        })),
    };
  });
  await page.screenshot({ path: `${root}/${phase}-${c.id}.png` });
  await page.addScriptTag({ path: "/home/mendy/skills/ui-polish/scripts/alignment-guides.js" });
  await page.evaluate(() =>
    window.uiPolishAlignment.draw([
      { selector: '[data-slot="filter-menu-panel"]', edges: ["left", "right", "top", "bottom"] },
      ...(document.querySelector('[aria-label="Filter types"]')
        ? [
            {
              selector: '[aria-label="Filter types"] button:first-child',
              edges: ["top", "bottom", "centerY"],
            },
          ]
        : []),
    ]),
  );
  await page.screenshot({ path: `${root}/${phase}-${c.id}-guides.png` });
  report.cases.push({ ...c, ...geometry, errors });
  await context.close();
}
if (process.argv.includes("--performance"))
  report.cases = JSON.parse(
    await (await import("node:fs/promises")).readFile(`${root}/${phase}.json`, "utf8"),
  ).cases;
await writeFile(`${root}/${phase}.json`, JSON.stringify(report, null, 2));
for (const spec of process.argv.includes("--captures")
  ? []
  : [
      { fields: 1000, options: 4 },
      { fields: 6, options: 10000 },
      { fields: 1000, options: 10000 },
    ]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  for (let run = 0; run < 3; run++) {
    await page.goto(origin + "/?" + new URLSearchParams(spec));
    await page.getByRole("button", { name: "Open filters", exact: true }).waitFor();
    const start = await page.evaluate(() => performance.now());
    await page.getByRole("button", { name: "Open filters", exact: true }).click();
    await page.getByRole("searchbox", { name: "Search people" }).waitFor();
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    const opened = await page.evaluate(() => ({
      time: performance.now(),
      optionNodes: document.querySelectorAll('[role^="menuitem"]').length,
      nodes: document.querySelectorAll("*").length,
    }));
    const searchStart = await page.evaluate(() => performance.now());
    await page.getByRole("searchbox", { name: "Search people" }).fill("Person 09999");
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );
    const result = {
      openMs: opened.time - start,
      searchMs: (await page.evaluate(() => performance.now())) - searchStart,
      optionNodes: opened.optionNodes,
      nodes: opened.nodes,
    };
    report.performance.push({ ...spec, run, cpuSlowdown: 4, ...result });
    await writeFile(`${root}/${phase}.json`, JSON.stringify(report, null, 2));
  }
  await context.close();
}
await browser.close();
console.log(
  JSON.stringify(
    {
      phase,
      cases: report.cases.map((c) => ({
        id: c.id,
        overflow: c.pageOverflow,
        clipped: c.clipped.length,
      })),
      performance: report.performance,
    },
    null,
    2,
  ),
);
