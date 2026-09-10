"use client";

import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { Input } from "../customization.js";
import { cn } from "../utils.js";

/** The search row belongs to the option panel, with a visible inset keyboard focus ring. */
export function FilterOptionSearch({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div data-mendy-ui="" data-slot="filter-option-search" className="relative border-b">
      <Search
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        {...props}
        type="search"
        className={cn(
          "h-10 sm:pointer-fine:h-9 rounded-none border-0 bg-transparent ps-9 pe-3 shadow-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none",
          className,
        )}
      />
    </div>
  );
}
