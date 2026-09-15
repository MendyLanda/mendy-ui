import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs-nav";
import { docsPages } from "@/lib/docs-navigation";
import { source } from "@/lib/source";

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pages = docsPages.map((item) => {
    const page = source.getPage(item.url === "/docs" ? [] : item.url.slice(6).split("/"));
    return {
      ...item,
      description: page?.data.description ?? "",
      keywords: page?.data.toc.map((heading) => String(heading.title)).join(" ") ?? "",
    };
  });
  return (
    <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-10">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:self-start lg:pb-8">
        <DocsNav pages={pages} />
      </aside>
      {children}
    </div>
  );
}
