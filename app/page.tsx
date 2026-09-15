import Link from "next/link";
import { ArrowRight, SlidersHorizontal, Table2, PanelRight } from "lucide-react";
import { InstallCommand } from "@/components/install-command";
import { ComponentSource } from "@/components/component-source";
import { FiltersDemo } from "@/examples/filters-demo";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
      <section className="grid items-end gap-8 lg:grid-cols-[1fr_340px]" aria-labelledby="intro">
        <div>
          <p className="mb-4 text-sm text-muted-foreground">A component library by Mendy Landa</p>
          <h1 id="intro" className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Mendy UI
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
            My collection of React components. Table, Filters, and Sheet: the components I use
            across projects, with the small interactions already taken care of.
          </p>
          <Link
            href="/docs/installation"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
          >
            Get started <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div>
          <InstallCommand />
          <p className="mt-3 text-xs text-muted-foreground">
            React 19 · TypeScript · Tailwind optional
          </p>
        </div>
      </section>
      <section className="mt-12 sm:mt-16" aria-labelledby="demo-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 id="demo-heading" className="text-sm font-medium">
            Table + Filters
          </h2>
          <span className="text-xs text-muted-foreground">
            Live components. Try sorting, filtering, or selecting cells.
          </span>
        </div>
        <div className="rounded-xl border bg-card p-3 sm:p-5">
          <FiltersDemo />
        </div>
        <ComponentSource name="filters-demo" />
      </section>
      <section className="mt-12 grid gap-6 sm:grid-cols-3" aria-label="Components">
        <Link
          href="/docs/components/table"
          className="group rounded-xl border p-6 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Table2 className="mb-5 size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="flex items-center justify-between text-xl font-medium">
            Table <ArrowRight className="size-4" aria-hidden="true" />
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Typed columns, virtual scrolling, cell selection and copying. Start with rows and
            columns; connect your queries when you need to.
          </p>
        </Link>
        <Link
          href="/docs/components/filters"
          className="group rounded-xl border p-6 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <SlidersHorizontal className="mb-5 size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="flex items-center justify-between text-xl font-medium">
            Filters <ArrowRight className="size-4" aria-hidden="true" />
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Search, menus, editable chips, and typed state. Use it with a table, a list, or anywhere
            your application needs filters.
          </p>
        </Link>
        <Link
          href="/docs/components/sheet"
          className="group rounded-xl border p-6 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <PanelRight className="mb-5 size-5 text-muted-foreground" aria-hidden="true" />
          <h2 className="flex items-center justify-between text-xl font-medium">
            Sheet <ArrowRight className="size-4" aria-hidden="true" />
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Side panels with automatic stacking, pinning, and protection for unsaved changes.
          </p>
        </Link>
      </section>
    </div>
  );
}
