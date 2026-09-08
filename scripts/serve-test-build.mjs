import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

// Browser tests exercise the static export. Wrangler remains the deployment preview.
const root = resolve("out");
const headerRules = (await readFile(resolve(root, "_headers"), "utf8"))
  .trim()
  .split(/\n(?=\S)/)
  .map((block) => {
    const [pattern, ...lines] = block.split("\n");
    return {
      pattern: pattern.trim(),
      headers: Object.fromEntries(
        lines
          .filter((line) => line.includes(":"))
          .map((line) => {
            const colon = line.indexOf(":");
            return [line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim()];
          }),
      ),
    };
  });
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const headers = Object.assign(
      {},
      ...headerRules
        .filter(({ pattern }) =>
          pattern.endsWith("*") ? pathname.startsWith(pattern.slice(0, -1)) : pathname === pattern,
        )
        .map((rule) => rule.headers),
    );
    const file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end();
      return;
    }
    for (const candidate of [file, `${file}.html`, resolve(file, "index.html")]) {
      const info = await stat(candidate).catch(() => null);
      if (!info?.isFile()) continue;
      const body = await readFile(candidate);
      response.writeHead(200, {
        "content-type": types[extname(candidate)] ?? "application/octet-stream",
        ...headers,
      });
      response.end(request.method === "HEAD" ? undefined : body);
      return;
    }
    response.writeHead(404, { "content-type": types[".html"] });
    response.end(await readFile(resolve(root, "404.html")));
  } catch {
    response.writeHead(400).end();
  }
});
server.listen(Number(process.env.PORT ?? 8787), "127.0.0.1");
