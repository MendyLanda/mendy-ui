"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FilterOptionSearch } from "./filter-option-search.js";
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
  /** Search is enabled by default. Set false for a short list. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Disable during hover previews; focus on explicit entry instead. */
  autoFocus?: boolean;
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
  searchable = true,
  searchPlaceholder,
  emptyMessage = "No options found.",
  autoFocus = true,
  children,
}: SharedProps & { children: (options: readonly FilterOption[]) => ReactNode }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!searchable || !autoFocus) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [searchable, autoFocus]);
  const filtered = !searchable
    ? options
    : options.filter((option) =>
        option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      );

  return (
    <div
      className="w-full"
      data-mendy-ui=""
      data-slot="filter-options"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      {searchable && (
        <FilterOptionSearch
          ref={inputRef}
          aria-label={label}
          placeholder={searchPlaceholder ?? label}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKey}
        />
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
  /** Empty string by default, preserving the string-valued callback. */
  clearValue?: string;
  removable?: boolean;
  closeOnSelect?: boolean;
}

/** Apply immediately, toggle the current choice off, and keep the dropdown open by default. */
export function FilterSelectEditor({
  value,
  onValueChange,
  clearValue = "",
  removable = true,
  closeOnSelect = false,
  ...props
}: FilterSelectEditorProps) {
  return (
    <SearchableOptions {...props}>
      {(options) => (
        <DropdownMenuRadioGroup value={value} aria-label={props.label}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              onSelect={(event) => {
                if (!closeOnSelect) event.preventDefault();
                onValueChange(removable && value === option.value ? clearValue : option.value);
              }}
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
