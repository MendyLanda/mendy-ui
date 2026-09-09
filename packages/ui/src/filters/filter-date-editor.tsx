"use client";

import type { DateRange as CalendarRange } from "react-day-picker";
import type { DateRange, RuntimeField } from "./filter-definition.js";
import { useValueDraft } from "./use-value-draft.js";
import { Calendar } from "../customization.js";
import { Button } from "../customization.js";

// Use local calendar dates, without converting through a UTC timestamp.
function calendarDate(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00`) : undefined;
}
function dateString(value: Date | undefined) {
  if (!value) return null;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function FilterDateEditor({
  field,
  value,
  disabled,
  apply,
  error,
  draftKey,
  autoFocus = true,
  showLabel = true,
  showClear = true,
}: {
  draftKey?: string;
  autoFocus?: boolean;
  showLabel?: boolean;
  showClear?: boolean;
  field: RuntimeField;
  value: unknown;
  disabled?: boolean;
  apply(value: unknown, shouldClose?: boolean): void;
  error?: string;
}) {
  const [range, setRange] = useValueDraft(
    value as DateRange | null,
    (current): CalendarRange | undefined =>
      current ? { from: calendarDate(current.from), to: calendarDate(current.to) } : undefined,
    draftKey,
  );
  return (
    <div
      data-mendy-ui=""
      onKeyDown={(event) => {
        // Calendar arrows navigate days. Escape still dismisses the surrounding editor.
        if (event.key !== "Escape") event.stopPropagation();
      }}
    >
      {showLabel && <p className="px-3 pt-3 text-sm font-medium">{field.label}</p>}
      <Calendar
        className="mx-auto [--cell-size:min(2rem,calc((100vw-3.5rem)/7))] pointer-coarse:[--cell-size:min(2.5rem,calc((100vw-3.5rem)/7))]"
        mode="range"
        autoFocus={autoFocus}
        selected={range}
        onSelect={(next) => {
          const selected = next ? { from: next.from, to: next.to ?? next.from } : undefined;
          setRange(selected);
          apply(
            selected
              ? { from: dateString(selected.from), to: dateString(selected.to) }
              : field.clearValue,
            false,
          );
        }}
        defaultMonth={range?.from ?? range?.to}
        disabled={disabled}
      />
      <div data-mendy-ui="" className="space-y-2 border-t p-3">
        <p className="text-xs text-muted-foreground">Pick a day, or two dates for a range.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {showClear && (
          <div data-mendy-ui="" className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="-ms-2 px-2"
              disabled={disabled || !range}
              onClick={() => {
                setRange(undefined);
                apply(field.clearValue);
              }}
            >
              Clear date
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
