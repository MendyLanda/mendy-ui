import { source } from "@/lib/source";
import { SITE } from "@/constants/site";
export const dynamic = "force-static";
export function GET() {
  const lines = source
    .getPages()
    .map(
      (page) => `- [${page.data.title}](${SITE.url}${page.url}): ${page.data.description ?? ""}`,
    );
  return new Response(
    `# Mendy UI\n\n${SITE.description}\n\n${lines.join("\n")}\n\n- [Full documentation](${SITE.url}/llms-full.txt)\n- [npm package](https://www.npmjs.com/package/@mendylanda/ui)\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
