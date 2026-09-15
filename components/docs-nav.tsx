"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NavPage = { url: string; title: string; group: string; description: string; keywords: string };
export function DocsNav({ pages }: { pages: NavPage[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const current = pages.find((page) => page.url === pathname);
  const matches = pages.filter((page) =>
    `${page.title} ${page.group} ${page.description} ${page.keywords}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const groups = [...new Set(matches.map((page) => page.group))];
  return (
    <nav aria-label="Documentation">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="docs-navigation"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm lg:hidden"
      >
        {current ? `${current.group} / ${current.title}` : "Documentation"}
        <ChevronDown aria-hidden="true" className="size-4" />
      </button>
      <div
        id="docs-navigation"
        className={cn("mt-4 space-y-6 lg:mt-0 lg:block", !open && "hidden")}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Find a documentation page"
            type="search"
            placeholder="Find a page…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 px-3 text-xs font-semibold">{group}</p>
            <ul className="space-y-0.5">
              {matches
                .filter((page) => page.group === group)
                .map((page) => (
                  <li key={page.url}>
                    <Link
                      href={page.url}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                      }}
                      aria-current={pathname === page.url ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                        pathname === page.url && "bg-muted font-medium text-foreground",
                      )}
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {!matches.length && (
          <p role="status" className="px-3 text-sm text-muted-foreground">
            No pages match “{query}”.
          </p>
        )}
      </div>
    </nav>
  );
}
