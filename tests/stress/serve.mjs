import { build, preview } from "vite";
import { resolve } from "node:path";
await build({
  configFile: false,
  root: resolve("tests/stress"),
  css: { postcss: { plugins: [] } },
  build: { outDir: resolve("artifacts/stress-build"), emptyOutDir: true },
  resolve: { dedupe: ["react", "react-dom"] },
});
await preview({
  configFile: false,
  root: resolve("tests/stress"),
  build: { outDir: resolve("artifacts/stress-build") },
  preview: { host: "127.0.0.1", port: 8790, strictPort: true },
});
