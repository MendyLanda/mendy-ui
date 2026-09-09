"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "../customization.js";
import { Label } from "../customization.js";
import { Search } from "lucide-react";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "../primitives/dropdown-menu.js";
import { FilterCheckboxItem } from "./filters.js";

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

function SearchableOptions({
  label,
  options,
  searchable,
  searchPlaceholder,
  emptyMessage = "No options found.",
  children,
}: SharedProps & { children: (options: readonly FilterOption[]) => ReactNode }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!searchable) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [searchable]);
  const id = useId();
  const filtered = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  return (
    <div
      className="w-64 max-w-full"
      data-mendy-ui=""
      data-slot="filter-options"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      {searchable && (
        <div data-mendy-ui="" className="relative border-b p-2">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 opacity-50"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <Label htmlFor={id} className="sr-only">
            {label}
          </Label>
          <Input
            ref={inputRef}
            id={id}
            type="search"
            className="pl-8 [&::-webkit-search-cancel-button]:appearance-none"
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
  const selected = new Set(values);
  return (
    <SearchableOptions {...props}>
      {(options) => (
        <div role="group" aria-label={props.label}>
          {options.map((option) => (
            <FilterCheckboxItem
              key={option.value}
              disabled={option.disabled}
              checked={selected.has(option.value)}
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
