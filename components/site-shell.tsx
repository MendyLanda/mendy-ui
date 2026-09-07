import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeControls } from "@/components/theme-controls";
import { SITE } from "@/constants/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="shrink-0 text-sm font-semibold">
          Mendy UI
        </Link>
        <nav
          aria-label="Main navigation"
          className="ml-auto flex items-center gap-2 sm:gap-4 text-sm"
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
          <a href={SITE.github} className="text-muted-foreground hover:text-foreground">
            GitHub
          </a>
          <div className="flex items-center">
            <ThemeControls />
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>
          <a href="https://mendylanda.com" className="hover:text-foreground">
            Mendy Landa
          </a>
        </p>
        <div className="flex gap-4">
          <a href={`${SITE.github}/blob/main/LICENSE`} className="hover:text-foreground">
            MIT license
          </a>
          <a href={SITE.github} className="hover:text-foreground">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
