"use client";

import type { PointerEvent, ReactNode, RefObject } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button, Input } from "../customization.js";
import type { CollectionHandle } from "./filter-collection.js";
import { FilterCollection } from "./filter-collection.js";
import { useValueDraft } from "./use-value-draft.js";
import { DropdownMenuContent } from "../primitives/dropdown-menu.js";
import { useMendyUI } from "../customization.js";
import {
  focusMenuEditor,
  handleMenuTab,
  handleMenuReturn,
  preserveOutsideFocus,
} from "./filter-menu-focus.js";
import {
  useMenuPlacement,
  useEditorOffset,
  useAnchoredPointerEvents,
} from "./use-menu-placement.js";
import { useMenuPointer } from "./use-menu-pointer.js";
import { cn } from "../utils.js";

export interface FilterMenuSection {
  id: string;
  label: string;
  editorLabel: string;
  icon?: ReactNode;
  disabled: boolean;
  active: boolean;
  separatorBefore?: boolean;
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

function selectedSection(sections: FilterMenuSection[], selectedId: string | null) {
  return sections.find((section) => section.id === selectedId && !section.disabled);
}

/** One dialog contains the filter list and its editor, with a single-panel layout on phones. */
export function FilterMenuPanel({
  sections,
  selectedId,
  onSelect,
  onClose,
  anchor,
  trigger,
}: FilterMenuPanelProps) {
  const { classNames, menuLayout } = useMendyUI();
  const desktop = useSyncExternalStore(subscribeViewport, isDesktop, serverDesktop);
  const selected = selectedSection(sections, selectedId);
  const content = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const pendingEditorFocus = useRef(false);
  const { alignOffset, side, anchorStyle } = useMenuPlacement(anchor, trigger, desktop);
  const panelId = useId();
  const detached = desktop && menuLayout !== "connected";
  const setContent = useAnchoredPointerEvents(content, detached);
  const editorPanel = useRef<HTMLDivElement>(null);
  const editorOffset = useEditorOffset({
    detached,
    editorPanel,
    content,
    rows,
    selectedId: selected?.id,
  });
  const initialSelection = useRef(selected?.id);
  const lastSelection = useRef(selected?.id);
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
    lastSelection.current = previous;
    pointer.cancel();
    onSelect(null);
    requestAnimationFrame(() => previous && rows.current.get(previous)?.focus());
  }
  const showList = desktop || !selected;
  const sideBySide = desktop && Boolean(selected);
  return (
    <DropdownMenuContent
      ref={setContent}
      data-mendy-ui=""
      data-slot="filter-menu-panel"
      role="dialog"
      aria-label="Filters"
      aria-labelledby={undefined}
      aria-orientation={undefined}
      align={desktop ? "start" : "end"}
      alignOffset={alignOffset}
      side={side}
      style={anchorStyle}
      sideOffset={7}
      collisionPadding={16}
      onEscapeKeyDown={(event) => {
        if (selected && !desktop) {
          event.preventDefault();
          back();
        }
      }}
      onCloseAutoFocus={preserveOutsideFocus}
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
      onKeyDown={(event) =>
        handleMenuReturn(event, () => {
          if (desktop) rows.current.get(selected?.id ?? "")?.focus();
          else back();
        })
      }
      className={cn(
        "[--filter-menu-height:min(var(--mendy-filter-menu-max-height,44rem),var(--radix-dropdown-menu-content-available-height,44rem))] max-h-(--filter-menu-height) max-w-[calc(100vw-2rem)] overflow-hidden p-0 shadow-md animate-none! [&_*]:transition-none!",
        "[--filter-list-width:var(--mendy-filter-list-width,var(--mendy-filter-anchor-width,13rem))]",
        sideBySide
          ? "w-[var(--mendy-filter-menu-width,calc(var(--filter-list-width)_+_var(--mendy-filter-editor-width,19rem)))]"
          : "w-[var(--mendy-filter-list-width,var(--mendy-filter-anchor-width,18.75rem))]",
        detached && "pointer-events-none overflow-visible border-0 bg-transparent shadow-none",
        classNames?.menu,
      )}
    >
      <div
        className={cn(
          "max-h-[calc(var(--filter-menu-height)-2px)]",
          sideBySide
            ? "grid grid-rows-[minmax(0,1fr)] grid-cols-[min(var(--filter-list-width),calc(100%_-_min(var(--mendy-filter-editor-width,19rem),50%)))_minmax(0,1fr)]"
            : "flex flex-col",
          detached && cn("drop-shadow-md", selected && "items-start"),
        )}
      >
        {showList && (
          <FilterMenuList
            sections={sections}
            selectedId={selected?.id}
            initialKey={selected?.id ?? lastSelection.current}
            panelId={panelId}
            desktop={desktop}
            detached={detached}
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
          <div
            ref={editorPanel}
            data-slot="filter-menu-editor"
            onPointerEnter={pointer.cancel}
            style={detached ? { marginTop: editorOffset } : undefined}
            className={cn(
              "flex min-h-0 min-w-0 max-h-[calc(var(--filter-menu-height)-2px)] flex-col",
              detached &&
                "pointer-events-auto -ms-px overflow-hidden rounded-md rounded-s-none border bg-popover text-popover-foreground",
            )}
          >
            <EditorHeading
              section={selected}
              desktop={desktop}
              back={back}
              onCleared={focusEditor}
            />
            <div
              key={selected.id}
              ref={editor}
              id={`${panelId}-${selected.id}`}
              role="group"
              aria-label={selected.editorLabel}
              tabIndex={-1}
              className={cn(
                "min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain outline-none [&>div]:w-full [&_[role^=menuitem]]:min-h-9 sm:pointer-fine:[&_[role^=menuitem]]:min-h-8",
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

function EditorHeading({
  section,
  desktop,
  back,
  onCleared,
}: {
  section: FilterMenuSection;
  desktop: boolean;
  back(): void;
  onCleared(): void;
}) {
  const { classNames } = useMendyUI();
  return (
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
      <MenuHeading label={section.label} />
      {section.clear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            section.clear?.();
            requestAnimationFrame(onCleared);
          }}
          aria-label={`Clear ${section.label} filter`}
          className="-me-1.5 h-6 px-1.5 text-xs font-normal text-muted-foreground"
        >
          Clear
        </Button>
      )}
    </div>
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
  initialKey?: string;
  panelId: string;
  desktop: boolean;
  detached: boolean;
  rows: RefObject<Map<string, HTMLButtonElement>>;
  choose(id: string, enter?: boolean): void;
  keyboardNavigation: boolean;
  onPointerMove(id: string, event: PointerEvent<HTMLButtonElement>): void;
}

function FilterMenuList({
  sections,
  selectedId,
  initialKey,
  panelId,
  desktop,
  detached,
  rows,
  choose,
  keyboardNavigation,
  onPointerMove,
}: FilterMenuListProps) {
  const { classNames } = useMendyUI();
  const [query, setQuery] = useValueDraft("types", () => "", "__menu:query");
  const collection = useRef<CollectionHandle>(null);
  const matches: (FilterMenuSection & { key: string })[] = [];
  const term = query.toLocaleLowerCase();
  for (const section of sections) {
    if (section.label.toLocaleLowerCase().includes(term))
      matches.push({ ...section, key: section.id });
  }
  return (
    <div
      data-slot="filter-menu-list"
      className={cn(
        "flex min-h-0 flex-col",
        desktop && selectedId && !detached && "border-e",
        detached &&
          "pointer-events-auto overflow-hidden rounded-md border bg-popover text-popover-foreground",
      )}
    >
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
                collection.current?.focusFirst();
              }
              if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
            }}
          />
        </div>
      )}
      {matches.length === 0 && (
        <p className="p-3 text-sm text-muted-foreground">
          {sections.length ? "No matching filters." : "No filters available."}
        </p>
      )}
      <FilterCollection
        items={matches}
        role="group"
        label="Filter types"
        collectionRef={collection}
        initialKey={initialKey}
        renderBefore={(section, index) =>
          index > 0 && section.separatorBefore && !query ? (
            <div data-slot="filter-menu-separator" className="py-1">
              <hr className="m-0 h-0 border-0 border-t" />
            </div>
          ) : null
        }
        className={cn("max-h-[calc(var(--filter-menu-height)-2px)]", classNames?.menuList)}
      >
        {(section, index, row) => (
          <Button
            key={section.id}
            {...row}
            ref={(node) => {
              row.ref(node);
              if (node) rows.current.set(section.id, node);
              else rows.current.delete(section.id);
            }}
            variant="ghost"
            type="button"
            aria-label={section.label}
            aria-description={
              matches.length > 100
                ? `${section.active ? "Filter applied. " : ""}${index + 1} of ${matches.length}`
                : section.active
                  ? "Filter applied"
                  : undefined
            }
            aria-expanded={selectedId === section.id}
            aria-controls={selectedId === section.id ? `${panelId}-${section.id}` : undefined}
            data-navigation={keyboardNavigation ? "keyboard" : "pointer"}
            data-separator={section.separatorBefore && !query ? "true" : undefined}
            disabled={section.disabled}
            className={cn(
              "h-auto min-h-10 w-full justify-start gap-2 rounded-sm px-2 py-2 text-sm font-normal sm:pointer-fine:min-h-8 sm:pointer-fine:py-1.5 data-[navigation=pointer]:focus-visible:ring-0",
              selectedId === section.id && "bg-accent text-accent-foreground",
              classNames?.menuRow,
            )}
            onPointerMove={(event) => {
              if (!section.disabled) onPointerMove(section.id, event);
            }}
            onClick={() => choose(section.id, true)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
              if ([rtl ? "ArrowLeft" : "ArrowRight", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                event.stopPropagation();
                choose(section.id, true);
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
        )}
      </FilterCollection>
    </div>
  );
}
