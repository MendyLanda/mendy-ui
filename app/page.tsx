import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, Code2, Puzzle, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallCommand } from "@/components/install-command";
import { FiltersDemo } from "@/examples/filters-demo";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <section className="grid grid-cols-1 gap-10 pb-14 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:gap-20 lg:pb-20">
        <div>
          <p className="mb-7 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Open source · Built on shadcn/ui
          </p>
          <h1 className="max-w-2xl text-5xl font-medium leading-[1.07] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Components,
            <br />
            <span className="text-muted-foreground">considered.</span>
          </h1>
          <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">
            Small details make better interfaces. Composable React components you can copy,
            understand, and make your own.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild>
              <Link href="/docs/components/filters">
                Explore filters
                <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <a href="#preview">
                Try the demo
                <ArrowDown />
              </a>
            </Button>
          </div>
        </div>
        <div className="space-y-5 pb-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            001 / Filters
          </p>
          <h2 className="text-2xl font-medium tracking-tight">Find exactly what matters.</h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Add a filter. Edit it in place. Remove it with one click. Keep the interaction
            consistent while your app owns the data.
          </p>
          <InstallCommand />
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="size-3.5" />
            React 19 · Tailwind CSS 4 · Radix
          </p>
        </div>
      </section>
      <section id="preview" className="scroll-mt-24 pb-20">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            A little less friction
          </p>
          <p className="text-xs text-muted-foreground">Go ahead. Change a filter.</p>
        </div>
        <FiltersDemo />
      </section>
      <section className="grid grid-cols-1 gap-10 border-t py-16 sm:grid-cols-3">
        <div>
          <Puzzle className="mb-4 size-5 text-muted-foreground" />
          <h2 className="mb-2 text-sm font-medium">Compose it your way</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Use the ready-made editors or bring your own. Your state, your queries, your table.
          </p>
        </div>
        <div>
          <Keyboard className="mb-4 size-5 text-muted-foreground" />
          <h2 className="mb-2 text-sm font-medium">Details included</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Keyboard navigation, focus restoration, and independent edit and remove controls.
          </p>
        </div>
        <div>
          <Code2 className="mb-4 size-5 text-muted-foreground" />
          <h2 className="mb-2 text-sm font-medium">The source is yours</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Install with the shadcn CLI. Read the source, change the styling, and ship it in your
            app.
          </p>
        </div>
      </section>
    </div>
  );
}
