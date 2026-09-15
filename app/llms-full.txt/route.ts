import { source } from "@/lib/source";
import { docsPages } from "@/lib/docs-navigation";
import { SITE } from "@/constants/site";
export const dynamic = "force-static";
export async function GET() {
  const pages = await Promise.all(
    docsPages.map(async (item) => {
      const page = source.getPage(item.url === "/docs" ? [] : item.url.slice(6).split("/"));
      if (!page) throw new Error(`Missing documentation: ${item.url}`);
      return `# ${item.group}: ${page.data.title}\n\nURL: ${SITE.url}${page.url}\n\n${await page.data.getText("processed")}`;
    }),
  );
  return new Response(pages.join("\n\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
