"use client";

// THROWAWAY: compare joined columns, expanding rows, and a single-panel menu.
import type { FilterEntry } from "@/registry/new-york/filter-state";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Circle,
  Flag,
  Users,
  CalendarDays,
  Type,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { PrototypeFieldEditor, usePrototypeRoot } from "@/registry/new-york/filter-bar";
import { cn } from "@/lib/utils";

export type PrototypeVariant = "joined" | "inline" | "compact";
const icons = {
  status: Circle,
  priority: Flag,
  assignee: Users,
  created: CalendarDays,
  title: Type,
};
const mediaQuery = "(min-width: 640px)";
function subscribe(listener: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const getSnapshot = () => window.matchMedia(mediaQuery).matches;
const getServerSnapshot = () => false;

export function PrototypeMenu({ variant }: { variant: PrototypeVariant }) {
  const { filters } = usePrototypeRoot();
  return filters.menuOpen ? <OpenMenu variant={variant} /> : null;
}

function OpenMenu({ variant }: { variant: PrototypeVariant }) {
  const { filters, disabled } = usePrototypeRoot();
  const wide = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const joined = variant === "joined" && wide;
  const inline = variant === "inline";
  const entries = filters.entries.filter(({ field }) => !field.hidden && field.menu !== false);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedId = selected ?? (joined ? entries[0]?.id : null);
  const entry = entries.find((item) => item.id === selectedId);
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const lastRow = useRef<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => rowRefs.current.values().next().value?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  function focusEditor() {
    requestAnimationFrame(() => {
      editorRef.current
        ?.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), [role^="menuitem"]:not([data-disabled]), button:not([disabled])',
        )
        ?.focus();
    });
  }
  function choose(id: string, enter = false) {
    setSelected(id);
    lastRow.current = id;
    if (enter) focusEditor();
  }
  function back() {
    const previous = entry?.id ?? lastRow.current;
    setSelected(null);
    requestAnimationFrame(() => previous && rowRefs.current.get(previous)?.focus());
  }
  function editor(item: FilterEntry) {
    return (
      <div
        key={item.id}
        ref={editorRef}
        id={`prototype-editor-${item.id}`}
        role="group"
        aria-label={`${item.field.label} options`}
        className={cn(
          "min-w-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-1 motion-safe:duration-150 [&>div]:w-full [&_[role^=menuitem]]:min-h-9",
          item.field.kind === "dateRange" && "[&>div>p:first-child]:hidden",
        )}
      >
        <PrototypeFieldEditor
          entry={item}
          active
          autoFocus={false}
          disabled={disabled || item.field.disabled}
          close={() => filters.setMenuOpen(false)}
          location="menu"
        />
      </div>
    );
  }
  function row(item: FilterEntry, index: number) {
    const Icon = icons[item.id as keyof typeof icons] ?? Circle;
    const current = item.id === entry?.id;
    const active = item.field.isActive(item.value);
    return (
      <Button
        ref={(node) => {
          if (node) rowRefs.current.set(item.id, node);
          else rowRefs.current.delete(item.id);
        }}
        variant="ghost"
        type="button"
        data-prototype-row={item.id}
        aria-label={`Choose ${item.field.label.toLowerCase()}`}
        aria-expanded={current}
        aria-controls={current ? `prototype-editor-${item.id}` : undefined}
        disabled={disabled || item.field.disabled}
        className={cn(
          "h-10 w-full justify-start gap-2 rounded-sm px-2 text-sm font-normal sm:h-9",
          current && "bg-accent text-accent-foreground",
        )}
        onPointerEnter={(event) => {
          if (joined && event.pointerType === "mouse") choose(item.id);
        }}
        onFocus={() => {
          if (joined) choose(item.id);
        }}
        onClick={() => {
          if (inline && current) setSelected(null);
          else choose(item.id, true);
        }}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? entries.length - 1
                  : (index + (event.key === "ArrowDown" ? 1 : -1) + entries.length) %
                    entries.length;
            rowRefs.current.get(entries[next]!.id)?.focus();
          }
          if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            choose(item.id, true);
          }
        }}
      >
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-left">{item.field.label}</span>
        {active && <span className="size-1.5 rounded-full bg-foreground" aria-label="Applied" />}
        {inline && current ? (
          <ChevronDown className="size-3.5 opacity-50" aria-hidden="true" />
        ) : (
          <ChevronRight className="size-3.5 opacity-50" aria-hidden="true" />
        )}
      </Button>
    );
  }
  return (
    <DropdownMenuContent
      ref={contentRef}
      role="dialog"
      aria-label="Filter picker prototype"
      aria-labelledby={undefined}
      aria-orientation={undefined}
      align="end"
      sideOffset={7}
      alignOffset={joined ? -102 : -4}
      collisionPadding={12}
      onEscapeKeyDown={(event) => {
        if (entry && !joined) {
          event.preventDefault();
          back();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
        if (
          event.key === "ArrowLeft" &&
          !(
            event.target instanceof HTMLElement &&
            event.target.matches('input, textarea, [role="gridcell"] *, [contenteditable=true]')
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (joined) rowRefs.current.get(entry?.id ?? "")?.focus();
          else back();
        }
      }}
      className={cn(
        "max-h-[min(480px,var(--radix-dropdown-menu-content-available-height))] max-w-[calc(100vw-1.5rem)] overflow-y-auto p-0 shadow-md motion-reduce:animate-none data-[state=closed]:animate-none!",
        joined ? "w-[448px]" : "w-[300px]",
      )}
    >
      {joined ? (
        <div className="grid grid-cols-[156px_minmax(0,1fr)] items-stretch">
          <div className="border-r p-1" role="group" aria-label="Filters">
            {entries.map((item, index) => (
              <div key={item.id}>{row(item, index)}</div>
            ))}
          </div>
          <div className="min-w-0">
            <div className="flex h-10 items-center justify-between border-b px-3 text-xs font-medium">
              {entry?.field.label}
              {entry?.field.isActive(entry.value) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-xs font-normal text-muted-foreground"
                  onClick={() => filters.remove(entry.id)}
                >
                  Clear
                </Button>
              )}
            </div>
            {entry && editor(entry)}
          </div>
        </div>
      ) : inline ? (
        <div className="p-1" role="group" aria-label="Filters">
          {entries.map((item, index) => (
            <div key={item.id}>
              {row(item, index)}
              {entry?.id === item.id && (
                <div className="my-1 overflow-hidden rounded-sm border bg-background">
                  {editor(item)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : entry ? (
        <div>
          <div className="flex h-10 items-center gap-2 border-b px-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              className="gap-1.5 px-2 text-xs font-normal"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Filters
            </Button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-medium">{entry.field.label}</span>
          </div>
          {editor(entry)}
        </div>
      ) : (
        <div className="p-1" role="group" aria-label="Filters">
          {entries.map((item, index) => (
            <div key={item.id}>{row(item, index)}</div>
          ))}
        </div>
      )}
    </DropdownMenuContent>
  );
}
