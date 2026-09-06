import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const origin = process.argv[2] ?? "https://ui.mendylanda.com";
// Resolve our nested registry dependencies against the candidate build being tested.
const proxy = createServer(async (request, response) => {
  try {
    const upstream = await fetch(new URL(request.url, origin));
    const body = await upstream.text();
    response.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    });
    response.end(body.replaceAll("https://ui.mendylanda.com/r/", `${registry}/r/`));
  } catch (error) {
    response.writeHead(502);
    response.end(String(error));
  }
});
await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
const registry = `http://127.0.0.1:${proxy.address().port}`;
const includeDemo = process.argv.includes("--demo");
const workspace = mkdtempSync(join(tmpdir(), "mendy-ui-consumers-"));
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("Run with pnpm verify:consumers [registry-origin].");
const rootPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

function write(dir, name, content) {
  const target = join(dir, name);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, typeof content === "string" ? content : JSON.stringify(content, null, 2));
}
async function run(dir, args) {
  const env = { ...process.env, CI: "true", NEXT_TELEMETRY_DISABLED: "1" };
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  const status = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [pnpm, ...args], { cwd: dir, env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", resolve);
  });
  if (status !== 0) throw new Error(`Consumer command failed: pnpm ${args.join(" ")} in ${dir}`);
}

try {
  for (const framework of ["vite", "next"]) {
    const dir = join(workspace, framework);
    const prefix = framework === "vite" ? "src/" : "";
    const alias = framework === "vite" ? "~" : "@";
    const css = framework === "vite" ? "src/index.css" : "app/globals.css";
    const dependencies = Object.fromEntries(
      ["react", "react-dom", "clsx", "tailwind-merge"].map((key) => [
        key,
        rootPackage.dependencies[key],
      ]),
    );
    if (framework === "next") dependencies.next = rootPackage.dependencies.next;
    const devDependencies = Object.fromEntries(
      [
        "typescript",
        "@types/react",
        "@types/react-dom",
        "@types/node",
        "tailwindcss",
        "@tailwindcss/postcss",
      ].map((key) => [key, rootPackage.devDependencies[key]]),
    );
    if (framework === "vite") devDependencies.vite = rootPackage.devDependencies.vite;
    write(dir, "package.json", {
      name: `mendy-ui-${framework}-consumer`,
      private: true,
      type: "module",
      packageManager: "pnpm@10.28.2",
      scripts: { build: framework === "vite" ? "tsc --noEmit && vite build" : "next build" },
      dependencies,
      devDependencies,
      pnpm: { onlyBuiltDependencies: ["esbuild", "sharp"] },
    });
    write(dir, "tsconfig.json", {
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "esnext"],
        jsx: "react-jsx",
        module: "esnext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        noEmit: true,
        paths: { [`${alias}/*`]: [`./${prefix}*`] },
      },
      include: ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
      exclude: ["node_modules"],
    });
    write(dir, "components.json", {
      $schema: "https://ui.shadcn.com/schema.json",
      style: "new-york",
      rsc: framework === "next",
      tsx: true,
      tailwind: { config: "", css, baseColor: "neutral", cssVariables: true },
      aliases: {
        components: `${alias}/components`,
        ui: `${alias}/components/ui`,
        lib: `${alias}/lib`,
        utils: `${alias}/lib/utils`,
        hooks: `${alias}/hooks`,
      },
      iconLibrary: "lucide",
    });
    write(
      dir,
      `${prefix}lib/utils.ts`,
      'import { clsx, type ClassValue } from "clsx";\nimport { twMerge } from "tailwind-merge";\nexport const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));\n',
    );
    write(dir, css, '@import "tailwindcss";\n');
    write(
      dir,
      "postcss.config.mjs",
      'export default { plugins: { "@tailwindcss/postcss": {} } };\n',
    );
    const consumer = `"use client";\nimport { useState } from "react";\nimport { AppliedFilter } from "${alias}/components/ui/filters";\nimport { FilterSelectEditor, FilterMultiSelectEditor } from "${alias}/components/ui/filter-select-editor";\nimport { FilterTextEditor } from "${alias}/components/ui/filter-text-editor";\nimport { parseFilterValues } from "${alias}/components/ui/filter-utils";\nexport default function Consumer() {\nconst [value, setValue] = useState("open");\nconst [values, setValues] = useState<string[]>([]);\nreturn <main><h1>Clean consumer</h1><AppliedFilter label="Status" editor={<FilterSelectEditor label="Status" value={value} onValueChange={setValue} options={[{value:"open",label:"Open"},{value:"closed",label:"Closed"}]} />}>{value}</AppliedFilter><AppliedFilter label="People" editor={<FilterMultiSelectEditor label="Search people" searchable values={values} onValuesChange={setValues} options={[{value:"a",label:"Alex"}]} />}>{values.join(",")}</AppliedFilter><AppliedFilter label="Tags" editor={<FilterTextEditor label="Tags" defaultValue="one,two" onApply={(text) => setValues(parseFilterValues(text))} />}>Tags</AppliedFilter></main>;\n}\n`;
    if (framework === "next") {
      write(dir, "app/page.tsx", consumer);
      write(
        dir,
        "app/layout.tsx",
        'import "./globals.css";\nimport type { ReactNode } from "react";\nexport default function Layout({children}: {children: ReactNode}) {return <html lang="en"><body>{children}</body></html>;}\n',
      );
      write(dir, "next.config.mjs", 'export default { output: "export" };\n');
    } else {
      write(dir, "src/vite-env.d.ts", '/// <reference types="vite/client" />\n');
      write(dir, "src/App.tsx", consumer);
      write(
        dir,
        "src/main.tsx",
        'import { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
      );
      write(
        dir,
        "index.html",
        '<!doctype html><html lang="en"><head><title>Clean consumer</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
      );
      write(
        dir,
        "vite.config.ts",
        'import { defineConfig } from "vite";\nimport { fileURLToPath } from "node:url";\nexport default defineConfig({resolve:{alias:{"~":fileURLToPath(new URL("./src", import.meta.url))}}});\n',
      );
    }
    await run(dir, ["install"]);
    await run(dir, [
      "dlx",
      `shadcn@${rootPackage.devDependencies.shadcn}`,
      "add",
      `${registry}/r/filters.json`,
      "--yes",
    ]);
    const files = readdirSync(join(dir, prefix, "components/ui")).filter((name) =>
      name.startsWith("filter"),
    );
    if (files.length !== 4) throw new Error(`Expected four filter files; got ${files.join(", ")}`);
    for (const name of files) {
      const code = readFileSync(join(dir, prefix, "components/ui", name), "utf8");
      if (code.includes("@/registry") || code.includes("@acme/"))
        throw new Error(`Unresolved source import in ${name}`);
    }
    await run(dir, ["build"]);
    console.log(`PASS: ${framework} clean install and build (${dir})`);
    if (includeDemo) {
      await run(dir, [
        "dlx",
        `shadcn@${rootPackage.devDependencies.shadcn}`,
        "add",
        `${registry}/r/filters-demo.json`,
        "--yes",
        "--overwrite",
      ]);
      write(
        dir,
        framework === "next" ? "app/page.tsx" : "src/App.tsx",
        `import { FiltersDemo } from "${alias}/components/filters-demo";\nexport default function DemoPage() { return <FiltersDemo />; }\n`,
      );
      await run(dir, ["build"]);
      console.log(`PASS: ${framework} demo install and build (${dir})`);
      if (framework === "next") {
        write(
          dir,
          "app/layout.tsx",
          'import "./globals.css";\nimport type { ReactNode } from "react";\nimport {NuqsAdapter} from "nuqs/adapters/next/app";\nexport default function Layout({children}: {children: ReactNode}) {return <html lang="en"><body><NuqsAdapter>{children}</NuqsAdapter></body></html>;}\n',
        );
        write(
          dir,
          "app/filter-example.tsx",
          '"use client";\nimport {filter, defineFilters} from "@/components/ui/filter-definition";\nimport {FilterBar} from "@/components/ui/filter-bar";\nimport {useUrlFilters} from "@/components/ui/use-url-filters";\nconst fields = defineFilters({status: filter.select({label: "Status", options: [{value: "open", label: "Open"}]})});\nexport default function Example(){ const filters = useUrlFilters(fields,{scope:"consumer"}); return <FilterBar filters={filters}/>;}\n',
        );
        write(
          dir,
          "app/page.tsx",
          'import {Suspense} from "react";\nimport Example from "./filter-example";\nexport default function Page(){return <Suspense fallback={null}><Example/></Suspense>;}\n',
        );
        await run(dir, ["build"]);
        console.log("PASS: Next.js App Router nuqs adapter and Suspense build");
      }
    }
  }
  console.log(`Consumer fixtures retained at ${workspace}`);
} finally {
  proxy.close();
}
