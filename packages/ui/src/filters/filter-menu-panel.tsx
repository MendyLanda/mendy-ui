"use client";

import type { PointerEvent, ReactNode, RefObject } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button, Input } from "../customization.js";
import { useValueDraft } from "./use-value-draft.js";
import { DropdownMenuContent } from "../primitives/dropdown-menu.js";
import { useMendyUI } from "../customization.js";
import { focusMenuEditor, handleMenuTab } from "./filter-menu-focus.js";
import { useMenuPointer } from "./use-menu-pointer.js";
import { cn } from "../utils.js";

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
  onClose(): void;
  anchor?: RefObject<HTMLDivElement | null>;
  trigger: RefObject<HTMLButtonElement | null>;
}
const desktopQuery = "(min-width: 640px)";
function subscribeViewport(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  const observer = new ResizeObserver(listener);
  observer.observe(document.documentElement);
  window.addEventListener("resize", listener);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener("resize", listener);
    observer.disconnect();
  };
}
const isDesktop = () =>
  window.innerWidth >= 40 * parseFloat(getComputedStyle(document.documentElement).fontSize);
const serverDesktop = () => false;

/** One dialog contains the filter list and its editor, with a single-panel layout on phones. */
export function FilterMenuPanel({
  sections,
  selectedId,
  onSelect,
  onClose,
  anchor,
  trigger,
}: FilterMenuPanelProps) {
  const { classNames } = useMendyUI();
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
  const initialSelection = useRef(selected?.id);
  const [keyboardNavigation, setKeyboardNavigation] = useState(
    () => trigger.current?.matches(":focus-visible") ?? false,
  );
  const pointer = useMenuPointer({
    editor,
    selectedId: selected?.id,
    onChoose(id) {
      choose(id);
      rows.current.get(id)?.focus({ preventScroll: true });
    },
  });

  useLayoutEffect(() => {
    const button = trigger.current;
    if (!button) return;
    const update = () => {
      const bounds = button.getBoundingClientRect();
      const target = anchor?.current?.getBoundingClientRect();
      const rtl = getComputedStyle(button).direction === "rtl";
      // Desktop starts at the search field's edge; mobile stays close to the icon.
      setAlignOffset(
        desktop
          ? rtl
            ? bounds.right - (target?.right ?? bounds.right)
            : (target?.left ?? bounds.left) - bounds.left
          : 0,
      );
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
      const first =
        rows.current.get(initialSelection.current ?? "") ??
        [...rows.current.values()].find((button) => !button.disabled);
      (first ?? content.current)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const focusEditor = () => focusMenuEditor(editor.current);
  useLayoutEffect(() => {
    if (!pendingEditorFocus.current) return;
    pendingEditorFocus.current = false;
    focusEditor();
  });

  function choose(id: string, enter = false) {
    pointer.cancel();
    if (enter && selected?.id === id && editor.current) focusEditor();
    else pendingEditorFocus.current = enter;
    onSelect(id);
  }
  function back() {
    const previous = selected?.id;
    pointer.cancel();
    onSelect(null);
    requestAnimationFrame(() => previous && rows.current.get(previous)?.focus());
  }
  const showList = desktop || !selected;
  return (
    <DropdownMenuContent
      ref={content}
      data-mendy-ui=""
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
      onPointerDownCapture={() => {
        setKeyboardNavigation(false);
        pointer.cancel();
      }}
      onPointerLeave={pointer.cancel}
      onKeyDownCapture={(event) => {
        if (
          !event.nativeEvent.isComposing &&
          !["Shift", "Control", "Alt", "Meta"].includes(event.key)
        )
          setKeyboardNavigation(true);
        if (event.key === "Tab") pointer.cancel();
        handleMenuTab(event, {
          trigger: trigger.current,
          editor: editor.current,
          onClose,
          hasSelection: Boolean(selected),
        });
      }}
      onKeyDown={(event) => {
        const target = event.target;
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        if (
          event.key === (rtl ? "ArrowRight" : "ArrowLeft") &&
          target instanceof HTMLElement &&
          !target.isContentEditable &&
          !target.closest(
            'input, textarea, select, [role="grid"], [role="slider"], [role="spinbutton"], [role="combobox"], [role="tablist"], [role="tree"], [role="listbox"]',
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          if (desktop) rows.current.get(selected?.id ?? "")?.focus();
          else back();
        }
      }}
      className={cn(
        "[--filter-menu-height:min(30rem,var(--radix-dropdown-menu-content-available-height))] max-h-(--filter-menu-height) max-w-[calc(100vw-1.5rem)] overflow-hidden p-0 shadow-md animate-none! [&_*]:transition-none!",
        desktop && selected ? "w-[var(--mendy-filter-menu-width,32rem)]" : "w-[18.75rem]",
        classNames?.menu,
      )}
    >
      <div
        className={cn(
          "max-h-[calc(var(--filter-menu-height)-2px)]",
          desktop && selected
            ? "grid grid-rows-[minmax(0,1fr)] grid-cols-[min(var(--mendy-filter-list-width,13rem),50%)_minmax(0,1fr)]"
            : "flex flex-col",
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
            keyboardNavigation={keyboardNavigation}
            onPointerMove={(id, event) => {
              if (desktop && event.pointerType === "mouse") {
                setKeyboardNavigation(false);
                const focused = document.activeElement;
                if (
                  focused instanceof HTMLElement &&
                  editor.current?.contains(focused) &&
                  (focused.matches("input, textarea") || focused.isContentEditable)
                ) {
                  pointer.cancel();
                  return;
                }
                pointer.move(id, event);
              }
            }}
          />
        )}
        {selected && (
          <div onPointerEnter={pointer.cancel} className="flex min-h-0 min-w-0 flex-col">
            <div
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2 border-b px-3 py-2 text-xs font-medium sm:pointer-fine:min-h-8 sm:pointer-fine:py-0.5",
                classNames?.menuHeader,
              )}
            >
              {!desktop && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={back}
                    className="-ms-2 gap-1.5 px-2 text-xs font-normal"
                  >
                    <ArrowLeft aria-hidden="true" className="size-3.5 rtl:rotate-180" />
                    Filters
                  </Button>
                  <span aria-hidden="true" className="text-muted-foreground">
                    /
                  </span>
                </>
              )}
              <MenuHeading label={selected.label} />
              {selected.clear && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    selected.clear?.();
                    requestAnimationFrame(focusEditor);
                  }}
                  aria-label={`Clear ${selected.label} filter`}
                  className="-me-1.5 h-6 px-1.5 text-xs font-normal text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <div
              key={selected.id}
              ref={editor}
              id={`${panelId}-${selected.id}`}
              role="group"
              aria-label={selected.editorLabel}
              tabIndex={-1}
              className={cn(
                "min-h-0 min-w-0 overflow-y-auto overscroll-contain outline-none [&>div]:w-full [&_[role^=menuitem]]:min-h-9 sm:pointer-fine:[&_[role^=menuitem]]:min-h-8",
                classNames?.editor,
              )}
            >
              {selected.content}
            </div>
          </div>
        )}
      </div>
    </DropdownMenuContent>
  );
}

function MenuHeading({ label }: { label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [below, setBelow] = useState(false);
  const measure = () => {
    const element = ref.current;
    if (!element) return;
    setOverflow(element.scrollHeight > element.clientHeight + 1);
    setBelow(element.scrollHeight - element.clientHeight - element.scrollTop > 1);
  };
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTop = 0;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [label]);
  return (
    <span
      ref={ref}
      onScroll={measure}
      title={label}
      tabIndex={overflow ? 0 : undefined}
      data-more-below={below}
      className="max-h-[min(6rem,calc(var(--filter-menu-height)*0.25))] min-w-0 flex-1 overflow-y-auto whitespace-normal [overflow-wrap:anywhere] [scrollbar-width:thin] data-[more-below=true]:[mask-image:linear-gradient(#000_calc(100%_-_1rem),transparent)] focus-visible:outline-1 focus-visible:outline-ring"
    >
      {label}
    </span>
  );
}

interface FilterMenuListProps {
  sections: FilterMenuSection[];
  selectedId?: string;
  panelId: string;
  desktop: boolean;
  rows: RefObject<Map<string, HTMLButtonElement>>;
  choose(id: string, enter?: boolean): void;
  keyboardNavigation: boolean;
  onPointerMove(id: string, event: PointerEvent<HTMLButtonElement>): void;
}

function FilterMenuList({
  sections,
  selectedId,
  panelId,
  desktop,
  rows,
  choose,
  keyboardNavigation,
  onPointerMove,
}: FilterMenuListProps) {
  const { classNames } = useMendyUI();
  const [query, setQuery] = useValueDraft("types", () => "", "__menu:query");
  const [window, setWindow] = useValueDraft(
    "types",
    () => ({ query, limit: 100 }),
    "__menu:window",
  );
  const limit = window.query === query ? window.limit : 100;
  const matches = sections.filter((section) =>
    section.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const shown = matches.slice(0, limit);
  const tabStop =
    shown.find((section) => section.id === selectedId && !section.disabled)?.id ??
    shown.find((section) => !section.disabled)?.id;
  function focusRow(id: string) {
    const index = matches.findIndex((section) => section.id === id);
    if (index >= limit) {
      setWindow({ query, limit: Math.ceil((index + 1) / 100) * 100 });
      requestAnimationFrame(() => rows.current.get(id)?.focus());
    } else rows.current.get(id)?.focus();
  }
  return (
    <div className={cn("flex min-h-0 flex-col", desktop && selectedId && "border-e")}>
      {sections.length > 20 && (
        <div className="shrink-0 border-b p-2">
          <Input
            type="search"
            aria-label="Find a filter"
            placeholder="Find a filter…"
            value={query}
            className="sm:pointer-fine:h-8"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                const first = matches.find((section) => !section.disabled);
                if (first) focusRow(first.id);
              }
              if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
            }}
          />
        </div>
      )}
      <div
        role="group"
        aria-label="Filter types"
        className={cn(
          "min-h-0 overflow-y-auto overscroll-contain p-1",

          classNames?.menuList,
        )}
      >
        {matches.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            {sections.length ? "No matching filters." : "No filters available."}
          </p>
        )}
        {shown.map((section) => (
          <Button
            key={section.id}
            ref={(node) => {
              if (node) rows.current.set(section.id, node);
              else rows.current.delete(section.id);
            }}
            variant="ghost"
            type="button"
            aria-label={section.label}
            aria-description={section.active ? "Filter applied" : undefined}
            aria-expanded={selectedId === section.id}
            aria-controls={selectedId === section.id ? `${panelId}-${section.id}` : undefined}
            tabIndex={tabStop === section.id ? 0 : -1}
            data-navigation={keyboardNavigation ? "keyboard" : "pointer"}
            disabled={section.disabled}
            className={cn(
              "h-auto min-h-10 w-full justify-start gap-2 rounded-sm px-2 py-2 text-sm font-normal sm:pointer-fine:min-h-8 sm:pointer-fine:py-1.5 data-[navigation=pointer]:focus-visible:ring-0",
              selectedId === section.id && "bg-accent text-accent-foreground",
              classNames?.menuRow,
            )}
            onPointerMove={(event) => {
              if (!section.disabled) onPointerMove(section.id, event);
            }}
            onFocus={() => {
              if (desktop) choose(section.id);
            }}
            onClick={() => choose(section.id, true)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
              if (
                ["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(event.key)
              ) {
                event.preventDefault();
                event.stopPropagation();
                const enabled = matches.filter((item) => !item.disabled);
                const index = enabled.findIndex((item) => item.id === section.id);
                const next =
                  event.key === "Home"
                    ? enabled[0]
                    : event.key === "End"
                      ? enabled.at(-1)
                      : event.key === "PageDown"
                        ? enabled[Math.min(index + 10, enabled.length - 1)]
                        : event.key === "PageUp"
                          ? enabled[Math.max(index - 10, 0)]
                          : enabled[
                              (index + (event.key === "ArrowDown" ? 1 : -1) + enabled.length) %
                                enabled.length
                            ];
                if (next) focusRow(next.id);
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
                event.preventDefault();
                event.stopPropagation();
                const start = matches.findIndex((item) => item.id === section.id) + 1;
                const next = [...matches.slice(start), ...matches.slice(0, start)].find(
                  (item) =>
                    !item.disabled &&
                    item.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()),
                );
                if (next) {
                  event.preventDefault();
                  event.stopPropagation();
                  focusRow(next.id);
                }
              }
            }}
          >
            {section.icon && (
              <span aria-hidden="true" className="shrink-0 text-muted-foreground [&_svg]:size-3.5">
                {section.icon}
              </span>
            )}
            <span
              className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere] text-start"
              title={section.label}
            >
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
        {matches.length > shown.length && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full whitespace-normal"
            onClick={() => {
              setWindow({ query, limit: limit + 100 });
              requestAnimationFrame(() => rows.current.get(matches[limit]!.id)?.focus());
            }}
          >
            Show more ({matches.length - shown.length} remaining)
          </Button>
        )}
      </div>
    </div>
  );
}
