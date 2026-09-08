"use client";

import type { DateRange as CalendarRange } from "react-day-picker";
import type { DateRange, RuntimeField } from "@/registry/new-york/filter-definition";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

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
  autoFocus = true,
}: {
  autoFocus?: boolean;
  field: RuntimeField;
  value: unknown;
  disabled?: boolean;
  apply(value: unknown, shouldClose?: boolean): void;
  error?: string;
}) {
  const initial = value as DateRange | null;
  const [range, setRange] = useState<CalendarRange | undefined>(() =>
    initial
      ? {
          from: calendarDate(initial.from),
          to: calendarDate(initial.to),
        }
      : undefined,
  );
  return (
    <div
      onKeyDown={(event) => {
        // Calendar arrows navigate days. Escape still dismisses the surrounding editor.
        if (event.key !== "Escape") event.stopPropagation();
      }}
    >
      <p className="px-3 pt-3 text-sm font-medium">{field.label}</p>
      <Calendar
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
      <div className="space-y-2 border-t p-3">
        <p className="text-xs text-muted-foreground">Pick a day, or two dates for a range.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              setRange(undefined);
              apply(field.clearValue);
            }}
          >
            Clear date
          </Button>
        </div>
      </div>
    </div>
  );
}
