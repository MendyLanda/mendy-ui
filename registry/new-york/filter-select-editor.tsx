"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { Search } from "lucide-react";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { FilterCheckboxItem } from "@/registry/new-york/filters";

export interface FilterOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SharedProps {
  label: string;
  options: readonly FilterOption[];
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

function SearchableOptions({
  label,
  options,
  searchable,
  searchPlaceholder,
  emptyMessage = "No options found.",
  children,
}: SharedProps & { children: (options: readonly FilterOption[]) => ReactNode }) {
  const [query, setQuery] = useState("");
  const id = useId();
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  function handleSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.currentTarget
        .closest("[data-slot=filter-options]")
        ?.querySelector<HTMLElement>('[role^="menuitem"]:not([data-disabled])')
        ?.focus();
    }
    if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
  }

  return (
    <div className="w-64 max-w-full" data-slot="filter-options">
      {searchable && (
        <div className="flex items-center border-b focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring">
          <Search
            className="mx-2 size-4 shrink-0 opacity-50"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <input
            id={id}
            type="search"
            className="flex h-10 min-w-0 w-full rounded-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
            placeholder={searchPlaceholder ?? label}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
          />
        </div>
      )}
      {filtered.length ? (
        <div role="menu" aria-label={label} className="p-1">
          {children(filtered)}
        </div>
      ) : (
        <p role="status" className="p-3 text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

export interface FilterSelectEditorProps extends SharedProps {
  value: string;
  onValueChange: (value: string) => void;
}

/** Single selection applies immediately and closes the dropdown. */
export function FilterSelectEditor({ value, onValueChange, ...props }: FilterSelectEditorProps) {
  return (
    <SearchableOptions {...props}>
      {(options) => (
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={onValueChange}
          aria-label={props.label}
        >
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      )}
    </SearchableOptions>
  );
}

export interface FilterMultiSelectEditorProps extends SharedProps {
  values: readonly string[];
  onValuesChange: (values: string[]) => void;
}

/** Multiple selections apply immediately and keep the editor open. */
export function FilterMultiSelectEditor({
  values,
  onValuesChange,
  ...props
}: FilterMultiSelectEditorProps) {
  return (
    <SearchableOptions {...props}>
      {(options) => (
        <div role="group" aria-label={props.label}>
          {options.map((option) => (
            <FilterCheckboxItem
              key={option.value}
              disabled={option.disabled}
              checked={values.includes(option.value)}
              onCheckedChange={(checked) =>
                onValuesChange(
                  checked
                    ? [...new Set([...values, option.value])]
                    : values.filter((value) => value !== option.value),
                )
              }
            >
              {option.label}
            </FilterCheckboxItem>
          ))}
        </div>
      )}
    </SearchableOptions>
  );
}
