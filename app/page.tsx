import Link from "next/link";
import { InstallCommand } from "@/components/install-command";
import { SITE } from "@/constants/site";
import { Suspense } from "react";
import { FiltersDemo } from "@/examples/filters-demo";
import { FilterMenuPrototype } from "@/components/filter-menu-prototype";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Mendy UI</h1>
      <p className="mt-1 text-muted-foreground">{SITE.description}</p>

      <section className="mt-10" aria-labelledby="filters-heading">
        <h2 id="filters-heading" className="text-lg font-medium">
          Filters
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Search, filter menus, and editable chips. Define your filters and connect your data.
        </p>
        <div className="mt-4">
          <Suspense fallback={<FiltersDemo />}>
            <FilterMenuPrototype />
          </Suspense>
        </div>
        <div className="mt-6">
          <InstallCommand />
        </div>
        <p className="mt-3 flex gap-4 text-sm">
          <Link href="/docs/components/filters" className="underline underline-offset-4">
            Docs
          </Link>
          <a
            href={`${SITE.github}/blob/main/registry/new-york/filter-bar.tsx`}
            className="underline underline-offset-4"
          >
            Source
          </a>
        </p>
      </section>
    </div>
  );
}
