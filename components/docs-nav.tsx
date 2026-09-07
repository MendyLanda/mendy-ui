"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function DocsNav({ pages }: { pages: { url: string; title: string }[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  return (
    <nav aria-label="Documentation" className="space-y-4">
      <Label className="block">
        <span className="sr-only">Find a documentation page</span>
        <Input
          type="search"
          placeholder="Find a page…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="text-xs"
        />
      </Label>
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
