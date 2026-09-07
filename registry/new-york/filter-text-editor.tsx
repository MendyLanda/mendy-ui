"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface FilterTextEditorProps {
  label: string;
  defaultValue: string;
  applyLabel?: string;
  commitMode?: "enter" | "apply";
  placeholder?: string;
  onApply: (value: string) => void;
  validate?: (value: string) => string | undefined;
}

/** A draft is local to the open editor. Enter commits it by default; explicit button submission is optional. */
export function FilterTextEditor({
  label,
  defaultValue,
  onApply,
  validate,
  applyLabel = "Apply",
  commitMode = "enter",
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
    <div
      className="w-72 max-w-full space-y-2 p-3"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Textarea
        ref={inputRef}
        id={id}
        value={draft}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (
            commitMode === "enter" &&
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            if (!error) onApply(draft);
          }
          // Let the textarea handle typing and cursor movement, not menu typeahead.
          if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
        }}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {commitMode === "apply" ? (
        <Button type="button" size="sm" disabled={Boolean(error)} onClick={() => onApply(draft)}>
          {applyLabel}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">Enter to save. Shift+Enter for a new line.</p>
      )}
    </div>
  );
}
