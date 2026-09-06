import Link from "next/link";
import { Code2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE } from "@/constants/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
          aria-label="Mendy UI home"
        >
          <span className="brand-mark" aria-hidden="true">
            m.
          </span>
          <span className="hidden whitespace-nowrap min-[360px]:inline">
            Mendy <span className="font-normal text-muted-foreground">UI</span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="ml-auto flex items-center gap-4 text-sm sm:gap-6"
        >
          <Link href="/docs" className="text-muted-foreground hover:text-foreground">
            Docs
          </Link>
          <Link
            href="/docs/components/filters"
            className="text-muted-foreground hover:text-foreground"
          >
            Filters
          </Link>
          <a
            href={SITE.github}
            aria-label="Mendy UI on GitHub"
            className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
          >
            <Code2 className="size-4" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground sm:px-8">
        <p>
          Made by{" "}
          <a
            href="https://mendylanda.com"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Mendy Landa
          </a>
          .
        </p>
        <div className="flex gap-5">
          <a href={`${SITE.github}/blob/main/LICENSE`}>MIT licensed</a>
          <a href={SITE.github}>Source on GitHub ↗</a>
        </div>
      </div>
    </footer>
  );
}
