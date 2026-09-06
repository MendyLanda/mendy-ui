"use client";

import type { ComponentProps, ReactNode } from "react";

import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type FilterEditorProps = ComponentProps<typeof DropdownMenu>;

export function FilterEditor(props: FilterEditorProps) {
  return <DropdownMenu modal={false} {...props} />;
}

export type FilterChipProps = ComponentProps<"div">;

export function FilterChip({ className, ...props }: FilterChipProps) {
  return (
    <div
      data-slot="filter-chip"
      className={cn(
        "inline-flex h-9 max-w-full items-center overflow-hidden rounded-md border bg-secondary/50 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type FilterEditorTriggerProps = ComponentProps<typeof DropdownMenuTrigger>;

export function FilterEditorTrigger({ className, ...props }: FilterEditorTriggerProps) {
  return (
    <DropdownMenuTrigger
      data-slot="filter-editor-trigger"
      aria-haspopup="dialog"
      className={cn(
        "flex h-full min-w-0 items-center gap-1.5 px-2 text-left hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type FilterEditorContentProps = ComponentProps<typeof DropdownMenuContent>;

export function FilterEditorContent({ className, onClick, ...props }: FilterEditorContentProps) {
  return (
    <DropdownMenuContent
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
    <button
      type="button"
      data-slot="filter-remove"
      className={cn(
        "flex h-full w-8 shrink-0 items-center justify-center border-l border-border/50 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <XIcon className="size-3.5" aria-hidden="true" />}
    </button>
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
            onClick={(event) => event.stopPropagation()}
          >
            {children}
          </FilterEditorTrigger>
        ) : (
          <span className="min-w-0 px-2">{children}</span>
        )}
        {onRemove && (
          <FilterRemove
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
};

export function FilterMenuItem({ label, icon, children, ...props }: FilterMenuItemProps) {
  return (
    <DropdownMenuSub {...props}>
      <DropdownMenuSubTrigger>
        {icon}
        <span>{label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent
          loop
          sideOffset={14}
          alignOffset={-4}
          className="max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto p-0"
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
