"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { m, LazyMotion, domAnimation, useReducedMotion } from "motion/react";

import { XIcon } from "lucide-react";

import { Button } from "../customization.js";
import { cn } from "../utils.js";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu.js";

export type FilterEditorProps = ComponentProps<typeof DropdownMenu>;

export function FilterEditor(props: FilterEditorProps) {
  return <DropdownMenu modal={false} {...props} />;
}

const ChipListContext = createContext(false);
const listVariant = {
  hidden: { y: 10, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.05, staggerChildren: 0.06 },
  },
};
const itemVariant = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, opacity: 1 },
};
const reducedVariant = {
  hidden: { y: 0, opacity: 1 },
  show: { y: 0, opacity: 1, transition: { duration: 0 } },
};

/** Preserve the original list stagger; newly inserted chips animate immediately. */
export function FilterChipList({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  return (
    <LazyMotion features={domAnimation}>
      <ChipListContext.Provider value>
        <m.div
          variants={reducedMotion ? reducedVariant : listVariant}
          initial="hidden"
          animate="show"
          className="contents"
        >
          {children}
        </m.div>
      </ChipListContext.Provider>
    </LazyMotion>
  );
}

export type FilterChipProps = ComponentProps<"div"> & { entranceDelay?: number };

export function FilterChip({ className, entranceDelay, ...props }: FilterChipProps) {
  const inList = useContext(ChipListContext);
  const reducedMotion = useReducedMotion();
  const content = (
    <m.div
      data-mendy-ui=""
      data-slot="filter-chip-entrance"
      variants={reducedMotion ? reducedVariant : itemVariant}
      initial={inList ? undefined : "hidden"}
      animate={inList ? undefined : "show"}
      transition={
        entranceDelay === undefined || reducedMotion ? undefined : { delay: entranceDelay }
      }
      className="min-w-0 max-w-full"
    >
      <div
        data-mendy-ui=""
        data-slot="filter-chip"
        className={cn(
          "inline-flex h-9 max-w-full overflow-hidden rounded-md items-center bg-secondary text-sm text-muted-foreground",
          className,
        )}
        {...props}
      />
    </m.div>
  );
  return inList ? content : <LazyMotion features={domAnimation}>{content}</LazyMotion>;
}

export type FilterEditorTriggerProps = ComponentProps<typeof DropdownMenuTrigger>;

export function FilterEditorTrigger({ className, asChild, ...props }: FilterEditorTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        asChild={asChild}
        variant="ghost"
        data-mendy-ui=""
        data-slot="filter-editor-trigger"
        aria-haspopup="dialog"
        className={cn(
          "flex h-full shrink rounded-none font-normal min-w-0 items-center gap-1.5 px-2 text-start hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-foreground",
          className,
        )}
        {...props}
      />
    </DropdownMenuTrigger>
  );
}

export type FilterEditorContentProps = ComponentProps<typeof DropdownMenuContent>;

export function FilterEditorContent({ className, onClick, ...props }: FilterEditorContentProps) {
  return (
    <DropdownMenuContent
      data-mendy-ui=""
      data-slot="filter-editor-content"
      role="dialog"
      aria-orientation={undefined}
      align="start"
      sideOffset={6}
      loop
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={cn(
        "max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-2rem)] overflow-y-auto p-0 data-[state=closed]:animate-none!",
        className,
      )}
      {...props}
    />
  );
}

export type FilterRemoveProps = ComponentProps<"button"> & {
  "aria-label": string;
};

export function FilterRemove({ className, children, ...props }: FilterRemoveProps) {
  return (
    <Button
      variant="ghost"
      type="button"
      data-mendy-ui=""
      data-slot="filter-remove"
      className={cn(
        "flex h-full rounded-none p-0 w-8 shrink-0 items-center justify-center border-s border-border/50 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon className="size-3.5" aria-hidden="true" />}
    </Button>
  );
}

export type AppliedFilterProps = FilterChipProps & {
  label: string;
  editor?: ReactNode;
  onRemove?: () => void;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  editLabel?: string;
  removeLabel?: string;
  contentProps?: FilterEditorContentProps;
  triggerProps?: FilterEditorTriggerProps;
  removeProps?: Omit<FilterRemoveProps, "aria-label" | "onClick">;
};

/** Editing and removal are independent. Values remain owned by the caller. */
export function AppliedFilter({
  label,
  editor,
  onRemove,
  disabled,
  open,
  onOpenChange,
  editLabel = `Edit ${label} filter`,
  removeLabel = `Remove ${label} filter`,
  contentProps,
  triggerProps,
  removeProps,
  children,
  ...props
}: AppliedFilterProps) {
  return (
    <FilterEditor open={open} onOpenChange={onOpenChange}>
      <FilterChip {...props}>
        {editor ? (
          <FilterEditorTrigger
            disabled={disabled}
            aria-label={editLabel}
            {...triggerProps}
            onClick={(event) => {
              event.stopPropagation();
              triggerProps?.onClick?.(event);
            }}
          >
            {children}
          </FilterEditorTrigger>
        ) : (
          <span className="min-w-0 px-2">{children}</span>
        )}
        {onRemove && (
          <FilterRemove
            {...removeProps}
            disabled={disabled}
            aria-label={removeLabel}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          />
        )}
        {editor && (
          <FilterEditorContent aria-label={`${label} filter`} {...contentProps}>
            {editor}
          </FilterEditorContent>
        )}
      </FilterChip>
    </FilterEditor>
  );
}

export type FilterMenuItemProps = ComponentProps<typeof DropdownMenuSub> & {
  label: ReactNode;
  icon?: ReactNode;
  contentProps?: ComponentProps<typeof DropdownMenuSubContent>;
};

export function FilterMenuItem({
  label,
  icon,
  children,
  contentProps,
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: FilterMenuItemProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [sideOffset, setSideOffset] = useState(14);
  const isOpen = open ?? internalOpen;
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const update = () => {
      // Overlap the parent menu when there isn't room for two panels side by side.
      const contentId = trigger.getAttribute("aria-controls");
      const content = contentId ? document.getElementById(contentId) : null;
      if (!content) return;
      const bounds = trigger.getBoundingClientRect();
      const available = Math.max(bounds.left, window.innerWidth - bounds.right);
      setSideOffset(available < content.offsetWidth + 14 ? -bounds.width : 14);
    };
    const observer = new ResizeObserver(update);
    observer.observe(trigger);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);
  return (
    <DropdownMenuSub
      {...props}
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setInternalOpen(nextOpen);
        onOpenChange?.(nextOpen);
      }}
    >
      <DropdownMenuSubTrigger
        ref={triggerRef}
        aria-haspopup={contentProps?.role === "dialog" ? "dialog" : "menu"}
        onKeyDown={(event) => {
          const forward =
            getComputedStyle(event.currentTarget).direction === "rtl" ? "ArrowLeft" : "ArrowRight";
          if (!isOpen && [forward, "Enter", " "].includes(event.key)) {
            const contentId = event.currentTarget.getAttribute("aria-controls");
            // A submenu reopened during its exit animation is still inert until
            // React commits the open state. Restore keyboard entry after that commit.
            requestAnimationFrame(() => {
              const content = contentId ? document.getElementById(contentId) : null;
              const input = content?.querySelector<HTMLElement>('input[type="search"], textarea');
              (input ?? content)?.focus();
            });
          }
        }}
      >
        {icon}
        <span>{label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          loop
          sideOffset={sideOffset}
          alignOffset={-4}
          {...contentProps}
          onFocusOutside={(event) => {
            contentProps?.onFocusOutside?.(event);
            // On narrow screens, leaving the row can focus its parent menu while
            // the pointer crosses into the overlapping submenu.
            if (event.target === triggerRef.current?.closest("[data-radix-menu-content]")) {
              event.preventDefault();
            }
          }}
          inert={!isOpen || contentProps?.inert}
          aria-hidden={!isOpen || contentProps?.["aria-hidden"]}
          {...(contentProps?.["aria-label"] ? { "aria-labelledby": undefined } : {})}
          className={cn(
            "max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-2rem)] overflow-y-auto p-0 motion-reduce:animate-none",
            contentProps?.className,
          )}
        >
          {children}
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}

export type FilterCheckboxItemProps = ComponentProps<typeof DropdownMenuCheckboxItem>;

/** Keep the editor open after pointer or keyboard selection. */
export function FilterCheckboxItem({ onSelect, ...props }: FilterCheckboxItemProps) {
  return (
    <DropdownMenuCheckboxItem
      {...props}
      onSelect={(event) => {
        onSelect?.(event);
        event.preventDefault();
      }}
    />
  );
}
