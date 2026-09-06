import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs-nav";
import { source } from "@/lib/source";

export default function DocsLayout({ children }: { children: ReactNode }) {
  const order = [
    "/docs",
    "/docs/installation",
    "/docs/components/filters",
    "/docs/examples",
    "/docs/api",
  ];
  const pages = source
    .getPages()
    .map((page) => ({ url: page.url, title: page.data.title }))
    .sort((a, b) => order.indexOf(a.url) - order.indexOf(b.url));
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-14 lg:py-12">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-4 px-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Documentation
        </p>
        <DocsNav pages={pages} />
      </aside>
      {children}
    </div>
  );
}
