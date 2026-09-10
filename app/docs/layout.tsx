import type { ReactNode } from "react";
import { DocsNav } from "@/components/docs-nav";
import { source } from "@/lib/source";

const order = [
  "/docs",
  "/docs/installation",
  "/docs/defaults",
  "/docs/components/filters",
  "/docs/examples",
  "/docs/advanced",
  "/docs/system",
  "/docs/api",
  "/docs/customization",
];

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pages = source
    .getPages()
    .map((page) => ({ url: page.url, title: page.data.title }))
    .sort((a, b) => {
      const first = order.indexOf(a.url);
      const second = order.indexOf(b.url);
      return (first < 0 ? order.length : first) - (second < 0 ? order.length : second);
    });
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-14 lg:py-12">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-3 px-3 text-sm font-medium">Documentation</p>
        <DocsNav pages={pages} />
      </aside>
      {children}
    </div>
  );
}
