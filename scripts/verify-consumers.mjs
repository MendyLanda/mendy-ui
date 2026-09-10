import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { chromium, devices, expect } from "@playwright/test";

const root = process.cwd();
const workspace = mkdtempSync(join(tmpdir(), "mendy-ui-npm-consumers-"));
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run with pnpm verify:consumers.");
function write(dir, file, value) {
  mkdirSync(join(dir, file, ".."), { recursive: true });
  writeFileSync(
    join(dir, file),
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}
async function run(dir, args, executable = process.execPath) {
  const env = { ...process.env, CI: "true", NEXT_TELEMETRY_DISABLED: "1" };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  const status = await new Promise((resolve, reject) => {
    const child = spawn(executable, executable === process.execPath ? [pnpm, ...args] : args, {
      cwd: dir,
      env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  if (status !== 0) throw new Error(`Consumer command failed: ${args.join(" ")} in ${dir}`);
}
await run(root, ["package:build"]);
await run(
  join(root, "packages/ui"),
  ["pack", "--ignore-scripts", "--pack-destination", workspace],
  "npm",
);
const tarball = join(
  workspace,
  readdirSync(workspace).find((name) => name.endsWith(".tgz")),
);
const packageInfo = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const versions = { ...packageInfo.dependencies, ...packageInfo.devDependencies };
const app = `"use client";
import { useState } from "react";
import { defineFilters, filter, FilterBar, useFilters, FilterRoot, FilterFieldEditor, MendyUIProvider } from "@mendylanda/ui/filters";
import { Input } from "@mendylanda/ui/primitives/input";
import type { MendyUIComponents } from "@mendylanda/ui/filters";
const ProjectInput: MendyUIComponents["Input"] = (props) => <Input {...props} data-project-input="" />;
const components = { Input: ProjectInput };
const definitions = defineFilters({
  status: filter.select({ label: "Status", options: [{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }], suggestion: { value: "open" } }),
  owner: filter.options({ label: "Owner", options: [{ id: "mendy", name: "Mendy", team: "Design" }, { id: "alex", name: "Alex", team: "Engineering" }], getValue: person => person.id, getLabel: person => person.name, searchable: true, renderOption: (person) => <span>{person.name} <small data-option-detail="">{person.team}</small></span> }),
  created: filter.dateRange({ label: "Created date" }),
  title: filter.text({ label: "Title" }),
});
export default function App() {
  const filters = useFilters(definitions);
  const [inlineField, setInlineField] = useState("owner");
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  return <main>
    <div className="w-64 px-3" id="unrelated-utility">Unrelated layout</div><button className="outside">Unrelated button</button><input aria-label="Unrelated input" className="outside" />
    <div ref={setContainer} id="local-theme" style={{ "--popover": "rgb(240, 250, 245)", "--radius": "0px" } as React.CSSProperties}>
      <MendyUIProvider portalContainer={container} components={components} classNames={{ menuRow: "project-row" }}>
        <FilterBar filters={filters} classNames={{ menu: "project-menu" }} />
        <section aria-label="Inline editor"><select aria-label="Inline field" value={inlineField} onChange={event => setInlineField(event.target.value)}><option value="owner">Owner</option><option value="title">Title</option><option value="created">Created date</option></select><FilterRoot filters={filters}><FilterFieldEditor id={inlineField} autoFocus={false} /></FilterRoot></section>
      </MendyUIProvider>
    </div>
    <output aria-label="Current values">{JSON.stringify(filters.values)}</output>
  </main>;
}
`;
for (const framework of ["vite", "next"]) {
  const dir = join(workspace, framework);
  const dependencies = {
    "@mendylanda/ui": `file:${tarball}`,
    react: versions.react,
    "react-dom": versions["react-dom"],
  };
  const devDependencies = Object.fromEntries(
    ["typescript", "@types/react", "@types/react-dom", "@types/node"].map((key) => [
      key,
      versions[key],
    ]),
  );
  if (framework === "vite") devDependencies.vite = versions.vite;
  else {
    dependencies.next = versions.next;
    // Exercise the minimum supported version used by SimCall. The site tests current nuqs.
    dependencies.nuqs = "2.8.8";
    dependencies.zod = versions.zod;
    dependencies["lucide-react"] = versions["lucide-react"];
    devDependencies.tailwindcss = versions.tailwindcss;
    devDependencies["@tailwindcss/postcss"] = versions["@tailwindcss/postcss"];
  }
  write(dir, "package.json", {
    name: `mendy-${framework}-consumer`,
    private: true,
    type: "module",
    scripts: { build: framework === "vite" ? "tsc --noEmit && vite build" : "next build" },
    dependencies,
    devDependencies,
    pnpm: { onlyBuiltDependencies: ["esbuild", "sharp"] },
  });
  write(dir, "tsconfig.json", {
    compilerOptions: {
      target: "ES2022",
      lib: ["DOM", "ES2022"],
      jsx: "react-jsx",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      noEmit: true,
    },
    include: ["**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
  });
  write(dir, "app.tsx", app);
  write(
    dir,
    "app.css",
    `.outside { border: 7px solid rgb(255, 0, 0); padding: 13px; font-size: 19px; border-radius: 11px; } body { font-family: Arial, sans-serif; } .project-row { min-height: 48px; } .project-menu { --mendy-filter-list-width: 220px; }`,
  );
  if (framework === "vite") {
    write(dir, "vite-env.d.ts", '/// <reference types="vite/client" />\n');
    write(
      dir,
      "index.html",
      '<html lang="en"><head><title>Package consumer</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
    );
    write(
      dir,
      "main.tsx",
      'import { createRoot } from "react-dom/client"; import App from "./app"; import "@mendylanda/ui/styles.css"; import "./app.css"; createRoot(document.getElementById("root")!).render(<App />);',
    );
  } else {
    write(dir, "next.config.mjs", 'export default { output: "export" };');
    write(dir, "postcss.config.mjs", 'export default { plugins: { "@tailwindcss/postcss": {} } };');
    write(
      dir,
      "app/globals.css",
      '@import "tailwindcss"; @import "@mendylanda/ui/styles.css"; @import "../app.css";',
    );
    write(
      dir,
      "app/layout.tsx",
      'import type {ReactNode} from "react"; import {NuqsAdapter} from "nuqs/adapters/next/app"; import "./globals.css"; export default function Layout({children}:{children:ReactNode}) { return <html lang="en"><body><NuqsAdapter>{children}</NuqsAdapter></body></html>; }',
    );
    write(
      dir,
      "app/url-example.tsx",
      '"use client"; import {defineFilters, filter, FilterBar} from "@mendylanda/ui/filters"; import {useUrlFilters} from "@mendylanda/ui/filters/nuqs"; const definitions = defineFilters({status: filter.select({label:"Status",options:[{value:"open",label:"Open"}]})}); export function UrlExample() { const filters=useUrlFilters(definitions,{scope:"consumer"}); return <section aria-label="URL filters"><FilterBar filters={filters}/></section>; }',
    );
    write(
      dir,
      "app/page.tsx",
      'import { Suspense } from "react"; import App from "../app"; import { UrlExample } from "./url-example"; export default function Page() { return <><App/><Suspense><UrlExample/></Suspense></>; }',
    );
    for (const file of readdirSync(join(root, "tests/types")))
      write(dir, `types/${file}`, readFileSync(join(root, "tests/types", file), "utf8"));
    for (const file of readdirSync(join(root, "examples"))) {
      let source = readFileSync(join(root, "examples", file), "utf8").replaceAll(
        "@/components/ui/",
        "@mendylanda/ui/primitives/",
      );
      write(dir, `examples/${file}`, source);
    }
  }
  await run(dir, ["install", "--no-frozen-lockfile"]);
  if (
    framework === "vite" &&
    (existsSync(join(dir, "node_modules/nuqs")) ||
      existsSync(join(dir, "node_modules/tailwindcss")))
  )
    throw new Error("Base consumer unexpectedly installed optional integrations.");
  await run(dir, ["build"]);
  const output = join(dir, framework === "vite" ? "dist" : "out");
  const server = createServer((req, res) => {
    const relative = new URL(req.url, "http://localhost").pathname;
    const file = resolve(output, relative === "/" ? "index.html" : relative.slice(1));
    if (!file.startsWith(output + "/")) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      res.setHeader(
        "Content-Type",
        file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "text/html",
      );
      res.end(readFileSync(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    for (const mobile of [false, true]) {
      const context = await browser.newContext(
        mobile ? devices["Pixel 7"] : { viewport: { width: 1280, height: 900 } },
      );
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin);
      if (framework === "vite") {
        const width = await page
          .locator("#unrelated-utility")
          .evaluate((element) => element.getBoundingClientRect().width);
        if (width === 256) throw new Error("Package utility styles leaked outside its scope.");
      }
      await expect(page.getByRole("button", { name: "Unrelated button" })).toHaveCSS(
        "border-top-width",
        "7px",
      );
      await expect(page.getByRole("button", { name: "Unrelated button" })).toHaveCSS(
        "padding-top",
        "13px",
      );
      await expect(page.getByRole("button", { name: "Apply Status filter" }).first()).toHaveCSS(
        "border-radius",
        "0px",
      );
      await expect(page.locator("[data-project-input]").first()).toHaveCSS("height", "36px");
      await page.getByRole("button", { name: "Open filters", exact: true }).first().click();
      const menu = page.getByRole("dialog", { name: "Filters", exact: true });
      await expect(page.locator("#local-theme").getByRole("dialog")).toBeVisible();
      await expect(menu).toHaveCSS("background-color", "rgb(240, 250, 245)");
      await expect(menu).toHaveCSS("animation-name", "none");
      const owner = menu.getByRole("button", { name: "Owner", exact: true });
      await expect(owner).toHaveCSS("min-height", "48px");
      await owner.click();
      await expect(menu.getByRole("searchbox", { name: "Search owner" })).toBeFocused();
      await expect(menu.getByRole("searchbox", { name: "Search owner" })).toHaveCSS(
        "padding-left",
        "36px",
      );
      await expect(menu.getByRole("searchbox", { name: "Search owner" })).toHaveCSS(
        "border-top-width",
        "0px",
      );
      const editor = menu.getByRole("group", { name: "Choose owner", exact: true });
      const widths = await editor.evaluate((element) => ({
        panel: element.clientWidth,
        content: element.firstElementChild.getBoundingClientRect().width,
      }));
      expect(Math.abs(widths.panel - widths.content)).toBeLessThanOrEqual(1);
      await expect(menu.locator("[data-option-detail]").first()).toContainText("Design");
      await menu.getByRole("menuitemcheckbox", { name: "Alex", exact: true }).click();
      await expect(page.getByLabel("Current values")).toContainText('"alex"');
      await expect(menu).toBeVisible();
      await page.keyboard.press("Escape");
      if (mobile) await page.keyboard.press("Escape");
      const inline = page.getByRole("region", { name: "Inline editor" });
      await inline.getByRole("button", { name: "Mendy", exact: true }).click();
      await expect(page.getByLabel("Current values")).toContainText('"mendy"');
      await page.getByRole("button", { name: "Open filters", exact: true }).first().click();
      await page.getByRole("button", { name: "Created date", exact: true }).click();
      await expect(page.locator('[data-slot="calendar"]')).toBeVisible();
      await menu.screenshot({
        path: join(workspace, `${framework}-${mobile ? "mobile" : "desktop"}.png`),
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      if (mobile) await page.keyboard.press("Escape");
      await page.getByLabel("Inline field").selectOption("title");
      const titleInput = inline.getByRole("textbox");
      await titleInput.fill("A draft title");
      await titleInput.press("Enter");
      await page.getByRole("button", { name: "Clear all", exact: true }).first().click();
      await expect(titleInput).toHaveValue("");
      await page.getByLabel("Inline field").selectOption("created");
      const today = inline.locator('[data-slot="calendar"]').getByRole("button", { name: /Today/ });
      await today.click();
      await expect(page.getByLabel("Current values")).not.toContainText('"created":null');
      await page.getByRole("button", { name: "Clear all", exact: true }).first().click();
      await expect(inline.locator('[data-selected-single="true"]')).toHaveCount(0);
      if (framework === "next") {
        await page
          .getByRole("region", { name: "URL filters" })
          .getByRole("button", { name: "Open filters" })
          .click();
        await page.getByRole("button", { name: "Status", exact: true }).click();
        await page.getByRole("menuitemradio", { name: "Open", exact: true }).click();
        await expect(page).toHaveURL(/status=open/);
        await page.reload();
        await expect(
          page
            .getByRole("region", { name: "URL filters" })
            .getByRole("button", { name: "Edit Status filter" }),
        ).toBeVisible();
      }
      expect(errors).toEqual([]);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(
    `PASS: ${framework} packed consumer, scoped styles, typed option content, custom input, local theme portal, inline editor and mobile menu.`,
  );
}
console.log(`Consumer fixtures and tarball retained at ${workspace}`);
