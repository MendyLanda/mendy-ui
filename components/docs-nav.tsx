"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function DocsNav({ pages }: { pages: { url: string; title: string }[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  return (
    <nav aria-label="Documentation" className="space-y-4">
      <label className="block">
        <span className="sr-only">Find a documentation page</span>
        <input
          type="search"
          placeholder="Find a page…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="flex flex-wrap gap-1 lg:flex-col">
        {pages
          .filter((page) => page.title.toLowerCase().includes(query.toLowerCase()))
          .map((page) => (
            <Link
              key={page.url}
              href={page.url}
              aria-current={pathname === page.url ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted",
                pathname === page.url && "bg-muted font-medium text-foreground",
              )}
            >
              {page.title}
            </Link>
          ))}
      </div>
    </nav>
  );
}
