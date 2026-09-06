import type { ComponentProps } from "react";
import { ComponentSource } from "@/components/component-source";
import { CopyButton } from "@/components/copy-button";
import { InstallCommand } from "@/components/install-command";
import { FiltersDemo } from "@/examples/filters-demo";
import { TextFilterDemo } from "@/examples/text-filter-demo";
import { CustomFilterDemo } from "@/examples/custom-filter-demo";
import { AdvancedFiltersDemo } from "@/examples/advanced-filters-demo";
import { SimCallFiltersDemo } from "@/examples/simcall-filters-demo";
import { cn } from "@/lib/utils";

// Typography and highlighted-code rendering adapted from startercn.
export const mdxComponents = {
  AdvancedFiltersDemo,
  SimCallFiltersDemo,
  ComponentSource,
  InstallCommand,
  FiltersDemo,
  TextFilterDemo,
  CustomFilterDemo,
  h2: ({ className, ...props }: ComponentProps<"h2">) => (
    <h2
      className={cn("mt-12 mb-4 scroll-mt-24 text-xl font-medium tracking-tight", className)}
      {...props}
    />
  ),
  h3: ({ className, ...props }: ComponentProps<"h3">) => (
    <h3 className={cn("mt-8 mb-3 scroll-mt-24 text-base font-medium", className)} {...props} />
  ),
  p: ({ className, ...props }: ComponentProps<"p">) => (
    <p className={cn("my-4 text-sm leading-7 text-muted-foreground", className)} {...props} />
  ),
  a: ({ className, ...props }: ComponentProps<"a">) => (
    <a
      className={cn("font-medium text-foreground underline underline-offset-4", className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: ComponentProps<"ul">) => (
    <ul
      className={cn(
        "my-4 ml-5 list-disc space-y-2 text-sm leading-6 text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }: ComponentProps<"ol">) => (
    <ol
      className={cn(
        "my-4 ml-5 list-decimal space-y-2 text-sm leading-6 text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  code: ({
    __raw__,
    __npm__: _npm,
    __yarn__: _yarn,
    __pnpm__: _pnpm,
    __bun__: _bun,
    className,
    ...props
  }: ComponentProps<"code"> & {
    __raw__?: string;
    __npm__?: string;
    __yarn__?: string;
    __pnpm__?: string;
    __bun__?: string;
  }) =>
    __raw__ ? (
      <>
        <CopyButton value={__raw__} />
        <code {...props} />
      </>
    ) : (
      <code
        className={cn(
          "rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground",
          className,
        )}
        {...props}
      />
    ),
  pre: ({ className, ...props }: ComponentProps<"pre">) => (
    <pre
      tabIndex={0}
      className={cn("overflow-x-auto p-4 pr-14 text-xs leading-6 sm:text-sm", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }: ComponentProps<"table">) => (
    <div className="my-6 overflow-x-auto rounded-lg border">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }: ComponentProps<"th">) => (
    <th className={cn("border-b bg-muted/40 px-4 py-3 font-medium", className)} {...props} />
  ),
  td: ({ className, ...props }: ComponentProps<"td">) => (
    <td className={cn("border-b px-4 py-3 text-muted-foreground", className)} {...props} />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote className="my-6 border-l-2 pl-4" {...props} />
  ),
};
