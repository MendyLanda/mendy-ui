"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface FilterMenuSection {
  id: string;
  label: string;
  editorLabel: string;
  icon?: ReactNode;
  disabled: boolean;
  active: boolean;
  clear?: () => void;
  content: ReactNode;
}
interface FilterMenuPanelProps {
  sections: FilterMenuSection[];
  selectedId: string | null;
  onSelect(id: string | null): void;
  anchor?: RefObject<HTMLDivElement | null>;
  trigger: RefObject<HTMLButtonElement | null>;
}
const desktopQuery = "(min-width: 640px)";
function subscribeViewport(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const isDesktop = () => window.matchMedia(desktopQuery).matches;
const serverDesktop = () => false;

/** One dialog contains the filter list and its editor, with a single-panel layout on phones. */
export function FilterMenuPanel({
  sections,
  selectedId,
  onSelect,
  anchor,
  trigger,
}: FilterMenuPanelProps) {
  const desktop = useSyncExternalStore(subscribeViewport, isDesktop, serverDesktop);
  const selected =
    sections.find((section) => section.id === selectedId && !section.disabled) ??
    (desktop ? sections.find((section) => !section.disabled) : undefined);
  const content = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const pendingEditorFocus = useRef(false);
  const [alignOffset, setAlignOffset] = useState(0);
  const panelId = useId();

  useLayoutEffect(() => {
    const button = trigger.current;
    if (!button) return;
    const update = () => {
      const bounds = button.getBoundingClientRect();
      const target = anchor?.current?.getBoundingClientRect();
      // Desktop starts at the search field's edge; mobile stays close to the icon.
      setAlignOffset(desktop ? (target?.left ?? bounds.left) - bounds.left : 0);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(anchor?.current ?? button);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [anchor, desktop, trigger]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const first = [...rows.current.values()].find((button) => !button.disabled);
      (first ?? content.current)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function focusEditor() {
    const root = editor.current;
    if (!root) return;
    // Prefer the current calendar day to month-navigation buttons.
    const target =
      root.querySelector<HTMLElement>(
        'input:not([disabled]), textarea:not([disabled]), [role="grid"] button[tabindex="0"], [role^="menuitem"]:not([data-disabled])',
      ) ?? root.querySelector<HTMLElement>('button:not([disabled]), [tabindex="0"]');
    (target ?? root).focus();
  }
  useLayoutEffect(() => {
    if (!pendingEditorFocus.current) return;
    pendingEditorFocus.current = false;
    focusEditor();
  });

  function choose(id: string, enter = false) {
    if (enter && selected?.id === id && editor.current) focusEditor();
    else pendingEditorFocus.current = enter;
    onSelect(id);
  }
  function back() {
    const previous = selected?.id;
    onSelect(null);
    requestAnimationFrame(() => previous && rows.current.get(previous)?.focus());
  }
  const showList = desktop || !selected;
  return (
    <DropdownMenuContent
      ref={content}
      data-slot="filter-menu-panel"
      role="dialog"
      aria-label="Filters"
      aria-labelledby={undefined}
      aria-orientation={undefined}
      align={desktop ? "start" : "end"}
      alignOffset={alignOffset}
      sideOffset={7}
      collisionPadding={12}
      onEscapeKeyDown={(event) => {
        if (selected && !desktop) {
          event.preventDefault();
          back();
        }
      }}
      onCloseAutoFocus={(event) => {
        const focused = document.activeElement;
        if (
          event.target instanceof HTMLElement &&
          focused &&
          focused !== document.body &&
          !event.target.contains(focused)
        )
          event.preventDefault();
      }}
      onKeyDown={(event) => {
        // Allow normal Tab traversal within the dialog; Radix menus normally cancel Tab.
        if (event.key === "Tab") event.stopPropagation();
        const target = event.target;
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        if (
          event.key === (rtl ? "ArrowRight" : "ArrowLeft") &&
          target instanceof HTMLElement &&
          !target.closest('input, textarea, select, [role="grid"], [contenteditable=true]')
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (desktop) rows.current.get(selected?.id ?? "")?.focus();
          else back();
        }
      }}
      className={cn(
        "[--filter-menu-height:min(480px,var(--radix-dropdown-menu-content-available-height))] max-h-(--filter-menu-height) max-w-[calc(100vw-1.5rem)] overflow-hidden p-0 shadow-md animate-none! [&_*]:transition-none!",
        desktop && selected ? "w-[448px]" : "w-[300px]",
      )}
    >
      <div
        className={cn(
          "max-h-(--filter-menu-height)",
          desktop && selected ? "grid grid-cols-[156px_minmax(0,1fr)]" : "flex flex-col",
        )}
      >
        {showList && (
          <FilterMenuList
            sections={sections}
            selectedId={selected?.id}
            panelId={panelId}
            desktop={desktop}
            rows={rows}
            choose={choose}
          />
        )}
        {selected && (
          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 text-xs font-medium">
              {!desktop && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={back}
                    className="-ml-2 gap-1.5 px-2 text-xs font-normal"
                  >
                    <ArrowLeft aria-hidden="true" className="size-3.5 rtl:rotate-180" />
                    Filters
                  </Button>
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                </>
              )}
              <span className="min-w-0 flex-1 truncate">{selected.label}</span>
              {selected.clear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    selected.clear?.();
                    requestAnimationFrame(focusEditor);
                  }}
                  aria-label={`Clear ${selected.label} filter`}
                  className="h-6 px-1.5 text-xs font-normal text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <div
              key={selected.id}
              ref={editor}
              id={panelId}
              role="group"
              aria-label={selected.editorLabel}
              tabIndex={-1}
              className="min-h-0 min-w-0 overflow-y-auto overscroll-contain outline-none [&>div]:w-full [&_[role^=menuitem]]:min-h-9"
            >
              {selected.content}
            </div>
          </div>
        )}
      </div>
    </DropdownMenuContent>
  );
}

interface FilterMenuListProps {
  sections: FilterMenuSection[];
  selectedId?: string;
  panelId: string;
  desktop: boolean;
  rows: RefObject<Map<string, HTMLButtonElement>>;
  choose(id: string, enter?: boolean): void;
}

function FilterMenuList({
  sections,
  selectedId,
  panelId,
  desktop,
  rows,
  choose,
}: FilterMenuListProps) {
  return (
    <div
      role="group"
      aria-label="Filter types"
      className={cn(
        "min-h-0 overflow-y-auto overscroll-contain p-1",
        desktop && selectedId && "border-r",
      )}
    >
      {sections.length === 0 && (
        <p className="p-3 text-sm text-muted-foreground">No filters available.</p>
      )}
      {sections.map((section) => (
        <Button
          key={section.id}
          ref={(node) => {
            if (node) rows.current.set(section.id, node);
            else rows.current.delete(section.id);
          }}
          variant="ghost"
          type="button"
          aria-label={section.label}
          aria-expanded={selectedId === section.id}
          aria-controls={selectedId === section.id ? panelId : undefined}
          disabled={section.disabled}
          className={cn(
            "h-10 w-full justify-start gap-2 rounded-sm px-2 text-sm font-normal sm:h-9",
            selectedId === section.id && "bg-accent text-accent-foreground",
          )}
          onPointerEnter={(event) => {
            if (desktop && event.pointerType === "mouse" && !section.disabled) choose(section.id);
          }}
          onFocus={() => {
            if (desktop) choose(section.id);
          }}
          onClick={() => choose(section.id, true)}
          onKeyDown={(event) => {
            const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
            if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              event.stopPropagation();
              const enabled = sections.filter((item) => !item.disabled);
              const index = enabled.findIndex((item) => item.id === section.id);
              const next =
                event.key === "Home"
                  ? enabled[0]
                  : event.key === "End"
                    ? enabled.at(-1)
                    : enabled[
                        (index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) %
                          enabled.length
                      ];
              if (next) rows.current.get(next.id)?.focus();
            } else if ([rtl ? "ArrowLeft" : "ArrowRight", "Enter", " "].includes(event.key)) {
              event.preventDefault();
              event.stopPropagation();
              choose(section.id, true);
            } else if (
              event.key.length === 1 &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey
            ) {
              const start = sections.findIndex((item) => item.id === section.id) + 1;
              const next = [...sections.slice(start), ...sections.slice(0, start)].find(
                (item) =>
                  !item.disabled &&
                  item.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()),
              );
              if (next) {
                event.preventDefault();
                event.stopPropagation();
                rows.current.get(next.id)?.focus();
              }
            }
          }}
        >
          {section.icon && (
            <span aria-hidden="true" className="shrink-0 text-muted-foreground [&_svg]:size-3.5">
              {section.icon}
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-left" title={section.label}>
            {section.label}
          </span>
          {section.active && (
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          )}
          <ChevronRight
            aria-hidden="true"
            className="size-3.5 shrink-0 opacity-50 rtl:rotate-180"
          />
        </Button>
      ))}
    </div>
  );
}
