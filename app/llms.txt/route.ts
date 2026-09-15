import { source } from "@/lib/source";
import { SITE } from "@/constants/site";
import { docsGroups } from "@/lib/docs-navigation";
export const dynamic = "force-static";
export function GET() {
  const groups = docsGroups.map((group) => {
    const lines = group.pages.map((item) => {
      const page = source.getPage(item.url === "/docs" ? [] : item.url.slice(6).split("/"));
      return `- [${item.title}](${SITE.url}${item.url}): ${page?.data.description ?? ""}`;
    });
    return `## ${group.title}\n\n${lines.join("\n")}`;
  });
  return new Response(
    `# Mendy UI\n\n${SITE.description}\n\n${groups.join("\n\n")}\n\n## Source\n\n- [Full documentation](${SITE.url}/llms-full.txt)\n- [npm package](https://www.npmjs.com/package/@mendylanda/ui)\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
