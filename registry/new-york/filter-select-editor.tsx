"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
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
    <div className="w-64 max-w-full p-1" data-slot="filter-options">
      {searchable && (
        <div className="border-b p-2 mb-1">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <Input
            id={id}
            type="search"
            placeholder={searchPlaceholder ?? label}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
          />
        </div>
      )}
      {filtered.length ? (
        <div role="menu" aria-label={label}>
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
