import { build, preview } from "vite";
import { resolve } from "node:path";
const root = resolve("tests/table-performance");
const outDir = resolve("artifacts/table-performance");
await build({
  configFile: false,
  root,
  css: { postcss: { plugins: [] } },
  build: { outDir, emptyOutDir: true },
  resolve: { dedupe: ["react", "react-dom"] },
});
await preview({
  configFile: false,
  root,
  build: { outDir },
  preview: { host: "127.0.0.1", port: 8796, strictPort: true },
});
