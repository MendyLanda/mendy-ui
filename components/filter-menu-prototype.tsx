"use client";

// THROWAWAY: three filter menu layouts on the homepage, gated by ?variant=.
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiltersDemo } from "@/examples/filters-demo";
import { FilterMenuPrototypeDemo } from "@/examples/filter-menu-prototype/demo";

const variants = [
  {
    key: "joined",
    label: "A · Joined panels",
    description:
      "Hover a filter to see its options on the right. On mobile, tap a filter, then use Back to switch.",
  },
  {
    key: "inline",
    label: "B · Expanding rows",
    description: "Open a filter inside the list. The other filters stay above and below it.",
  },
  {
    key: "compact",
    label: "C · Single panel",
    description: "Replace the list with the editor. Use Back to choose another filter.",
  },
] as const;

export function FilterMenuPrototype() {
  const params = useSearchParams();
  const router = useRouter();
  const index = variants.findIndex((variant) => variant.key === params.get("variant"));
  const current = variants[index];
  function cycle(delta: number) {
    const next = variants[(index + delta + variants.length) % variants.length]!;
    const search = new URLSearchParams(params.toString());
    search.set("variant", next.key);
    router.replace(`/?${search}`, { scroll: false });
  }
  useEffect(() => {
    if (index < 0) return;
    function onKeyDown(event: KeyboardEvent) {
      // Menu arrows belong to the filter interaction, never to the switcher.
      if (
        document.querySelector('[role="dialog"], [role="menu"]') ||
        (event.target instanceof HTMLElement &&
          event.target.closest("input, textarea, select, button, [contenteditable=true]"))
      )
        return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        cycle(event.key === "ArrowRight" ? 1 : -1);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });
  if (
    !current ||
    (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_FILTER_PROTOTYPE !== "1")
  )
    return <FiltersDemo />;
  return (
    <div className="pb-24">
      <p className="mb-3 text-xs text-muted-foreground">Menu experiment. {current.description}</p>
      <FilterMenuPrototypeDemo variant={current.key} />
      <nav
        aria-label="Prototype variants"
        className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-foreground p-1.5 text-background shadow-lg"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous variant"
          className="size-8 shrink-0 hover:bg-background/15 hover:text-background"
          onClick={() => cycle(-1)}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="min-w-0 whitespace-nowrap px-1 text-xs font-medium" aria-live="polite">
          {current.label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next variant"
          className="size-8 shrink-0 hover:bg-background/15 hover:text-background"
          onClick={() => cycle(1)}
        >
          <ArrowRight className="size-4" />
        </Button>
      </nav>
    </div>
  );
}
