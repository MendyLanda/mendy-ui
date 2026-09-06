"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface FilterTextEditorProps {
  label: string;
  defaultValue: string;
  applyLabel?: string;
  placeholder?: string;
  onApply: (value: string) => void;
  validate?: (value: string) => string | undefined;
}

/** A draft is local to the open editor. Only Apply commits it to the caller. */
export function FilterTextEditor({
  label,
  defaultValue,
  onApply,
  validate,
  applyLabel = "Apply",
  placeholder,
}: FilterTextEditorProps) {
  const id = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(defaultValue);
  const error = validate?.(draft);

  useEffect(() => {
    // Let a parent submenu finish setting up its focus scope first.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="w-72 space-y-2 p-3">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Textarea
        ref={inputRef}
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // Let the textarea handle typing and cursor movement, not menu typeahead.
          if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
        }}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="button" size="sm" disabled={Boolean(error)} onClick={() => onApply(draft)}>
        {applyLabel}
      </Button>
    </div>
  );
}
