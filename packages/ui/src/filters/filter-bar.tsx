"use client";

import type { CollectionHandle } from "./filter-collection.js";
import { FilterCollection } from "./filter-collection.js";
import type { ReactNode } from "react";
import type { Choice, RuntimeField, SummaryPolicy } from "./filter-definition.js";
import type { FilterController } from "./use-filters.js";
import type { FilterEntry, PasteAmbiguity } from "./filter-state.js";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useId,
  useRef,
  useState,
} from "react";
import {
  ListFilter,
  Search,
  X,
  Circle,
  ListChecks,
  Type,
  Hash,
  CalendarDays,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { Button } from "../customization.js";
import { Input } from "../customization.js";
import { Label } from "../customization.js";
import { FilterDateEditor } from "./filter-date-editor.js";
import { Textarea } from "../customization.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "../primitives/dropdown-menu.js";
import { AppliedFilter, FilterCheckboxItem } from "./filters.js";
import { FilterOptionCache, useFilterOptions } from "./use-filter-options.js";
import { classifyPaste, resolvePasteAmbiguity } from "./filter-state.js";
import { cn } from "../utils.js";
import { FilterMenuPanel } from "./filter-menu-panel.js";

import type { DraftCache } from "./use-value-draft.js";
import { FilterDraftCache, useValueDraft } from "./use-value-draft.js";
import { MendyUIProvider, useMendyUI } from "../customization.js";
import type { FilterClassNames } from "../customization.js";

export interface FilterMenuGroup {
  id: string;
  label: string;
  fields: string[];
  icon?: ReactNode;
}
interface RootContext {
  direction: "ltr" | "rtl";
  filters: FilterController;
  summary: SummaryPolicy;
  closeMenuOnApply: boolean;
  suggestions: "when-empty" | "always" | "never";
  groups: FilterMenuGroup[];
  disabled: boolean;
  trigger: React.RefObject<HTMLButtonElement | null>;
  ambiguous: PasteAmbiguity[];
  setAmbiguous(value: PasteAmbiguity[]): void;
}
const defaultGroups: FilterMenuGroup[] = [];
const defaultSummary: SummaryPolicy = { mode: "count", limit: 3 };
const Context = createContext<RootContext | null>(null);
function useRoot() {
  const context = useContext(Context);
  if (!context) throw new Error("Filter components must be inside FilterRoot.");
  return context;
}
export interface FilterRootProps {
  classNames?: FilterClassNames;
  filters: FilterController;
  summary?: SummaryPolicy;
  /** Keep the filter menu open for applying more filters by default. */
  closeMenuOnApply?: boolean;
  suggestions?: "when-empty" | "always" | "never";
  groups?: FilterMenuGroup[];
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}
export function FilterRoot({ classNames, ...props }: FilterRootProps) {
  return (
    <MendyUIProvider classNames={classNames}>
      <FilterRootContent {...props} />
    </MendyUIProvider>
  );
}
function FilterRootContent({
  filters,
  summary = defaultSummary,
  suggestions = "always",
  closeMenuOnApply = false,
  groups = defaultGroups,
  disabled = false,
  className,
  children,
}: FilterRootProps) {
  const { classNames } = useMendyUI();
  const [cache] = useState(() => new Map());
  const [ambiguous, setAmbiguous] = useState<PasteAmbiguity[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  useLayoutEffect(() => {
    if (filters.menuOpen && trigger.current)
      setDirection(getComputedStyle(trigger.current).direction === "rtl" ? "rtl" : "ltr");
  }, [filters.menuOpen]);
  const context = useMemo(
    () => ({
      direction,
      filters,
      summary,
      suggestions,
      closeMenuOnApply,
      groups,
      disabled,
      trigger,
      ambiguous,
      setAmbiguous,
    }),
    [filters, summary, suggestions, closeMenuOnApply, groups, disabled, ambiguous, direction],
  );
  return (
    <FilterOptionCache.Provider value={cache}>
      <Context.Provider value={context}>
        <div
          data-mendy-ui=""
          className={cn("flex flex-wrap items-center gap-2", classNames?.root, className)}
        >
          {children}
        </div>
      </Context.Provider>
    </FilterOptionCache.Provider>
  );
}
export function FilterBar(
  props: Omit<FilterRootProps, "children"> & { searchLabel?: string; searchPlaceholder?: string },
) {
  return (
    <FilterRoot {...props}>
      <FilterSearch label={props.searchLabel} placeholder={props.searchPlaceholder} />
      <FilterList />
      <FilterClear />
      <FilterFeedback />
    </FilterRoot>
  );
}
export function FilterSearch({
  label = "Search",
  placeholder = "Search or filter",
}: {
  label?: string;
  placeholder?: string;
}) {
  const { filters, trigger, disabled, setAmbiguous, direction } = useRoot();
  const { classNames } = useMendyUI();
  const anchor = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const shift = useRef(false);
  return (
    <DropdownMenu
      dir={direction}
      modal={false}
      open={filters.menuOpen}
      onOpenChange={filters.setMenuOpen}
    >
      <div
        ref={anchor}
        className={cn("relative w-full max-w-full shrink-0 sm:w-[21.875rem]", classNames?.search)}
      >
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          ref={input}
          type="text"
          role="searchbox"
          disabled={disabled}
          aria-label={label}
          placeholder={placeholder}
          value={filters.search}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            "w-full ps-9 text-sm [&::-webkit-search-cancel-button]:appearance-none",
            filters.search ? "pe-16" : "pe-9",
            classNames?.searchInput,
          )}
          onKeyDown={(event) => {
            shift.current = event.shiftKey;
            if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey) {
              const classified = classifyPaste(event.currentTarget.value, filters.entries);
              if (Object.keys(classified.changes).length || classified.ambiguous.length) {
                event.preventDefault();
                const result = filters.paste(event.currentTarget.value, { before: "", after: "" });
                setAmbiguous(result.ambiguous);
              }
            }
          }}
          onKeyUp={(event) => {
            shift.current = event.shiftKey;
          }}
          onChange={(event) => {
            setAmbiguous([]);
            filters.setSearch(event.target.value);
          }}
          onPaste={(event) => {
            if (shift.current) return;
            const text = event.clipboardData.getData("text");
            if (!text.trim() || !filters.entries.some((entry) => entry.field.recognize)) return;
            const classified = classifyPaste(text, filters.entries);
            if (!Object.keys(classified.changes).length && !classified.ambiguous.length) return;
            event.preventDefault();
            const element = event.currentTarget;
            // Search inputs do not expose selectionStart in every browser. Track a full-field
            // replacement when selected text matches the field; otherwise append safely.
            const selected = window.getSelection()?.toString();
            const start =
              element.selectionStart ?? (selected === element.value ? 0 : element.value.length);
            const end =
              element.selectionEnd ?? (selected === element.value ? element.value.length : start);
            const result = filters.paste(text, {
              before: element.value.slice(0, start),
              after: element.value.slice(end),
            });
            setAmbiguous(result.ambiguous);
          }}
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            type="button"
            disabled={disabled}
            aria-label="Clear search"
            className="absolute end-9 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm opacity-50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => {
              setAmbiguous([]);
              filters.setSearch("");
              input.current?.focus();
            }}
          >
            <X className="size-3.5" aria-hidden="true" />
          </Button>
        )}
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            ref={trigger}
            type="button"
            disabled={disabled}
            aria-label="Open filters"
            aria-haspopup="dialog"
            className={cn(
              "absolute end-1 top-1/2 size-7 -translate-y-1/2 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:opacity-100",
              filters.active.length ? "opacity-100" : "opacity-50",
              classNames?.menuTrigger,
            )}
          >
            <ListFilter className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
      </div>
      {filters.menuOpen && <FilterMenuContent anchor={anchor} />}
    </DropdownMenu>
  );
}
/** A standalone menu button for layouts without a search field. */
export function FilterMenu({
  children = "Add filter",
  asChild = false,
}: {
  children?: ReactNode;
  asChild?: boolean;
}) {
  const { filters, trigger, disabled, direction } = useRoot();
  const { classNames } = useMendyUI();
  return (
    <DropdownMenu
      dir={direction}
      modal={false}
      open={filters.menuOpen}
      onOpenChange={filters.setMenuOpen}
    >
      <DropdownMenuTrigger asChild>
        <Button
          ref={trigger}
          asChild={asChild}
          className={classNames?.menuTrigger}
          variant="outline"
          disabled={disabled}
          aria-haspopup="dialog"
        >
          {children}
        </Button>
      </DropdownMenuTrigger>
      {filters.menuOpen && <FilterMenuContent />}
    </DropdownMenu>
  );
}
const fieldIcons = {
  single: Circle,
  multi: ListChecks,
  text: Type,
  tokens: Hash,
  numberRange: Hash,
  dateRange: CalendarDays,
  custom: SlidersHorizontal,
};
function FilterMenuContent({ anchor }: { anchor?: React.RefObject<HTMLDivElement | null> }) {
  const { filters, groups, disabled, trigger } = useRoot();
  const [clearEpoch, setClearEpoch] = useState(0);
  const [drafts] = useState<DraftCache>(() => new Map());
  const grouped = new Set(groups.flatMap((group) => group.fields));
  const visible = filters.entries.filter(
    (entry) => !entry.field.hidden && entry.field.menu !== false,
  );
  const sections = [
    ...visible.flatMap((entry) =>
      grouped.has(entry.id)
        ? []
        : [
            {
              id: entry.id,
              label: entry.field.label,
              icon: entry.field.icon,
              entries: [entry],
            },
          ],
    ),
    ...groups.flatMap((group) => {
      const entries = visible.filter((entry) => group.fields.includes(entry.id));
      return entries.length ? [{ ...group, entries }] : [];
    }),
  ].map((section) => {
    const single = section.entries.length === 1 ? section.entries[0]!.field : undefined;
    const Icon = single ? fieldIcons[single.kind] : Layers;
    const active = section.entries.some((entry) => entry.field.isActive(entry.value));
    const clearable = section.entries.filter(
      (entry) =>
        entry.field.isActive(entry.value) &&
        !entry.field.disabled &&
        entry.field.removable !== false,
    );
    return {
      id: section.id,
      label: section.label,
      icon: section.icon ?? <Icon />,
      editorLabel:
        single?.editorLabel ??
        (single?.kind === "text" || single?.kind === "tokens"
          ? `Set ${section.label.toLowerCase()} filter`
          : `Choose ${section.label.toLowerCase()}`),
      disabled: disabled || section.entries.every((entry) => entry.field.disabled),
      active,
      clear:
        !disabled && clearable.length
          ? () => {
              const error = filters.batch(
                Object.fromEntries(clearable.map((entry) => [entry.id, entry.field.clearValue])),
                undefined,
                "remove",
              );
              if (!error) {
                for (const entry of section.entries)
                  for (const part of ["value", "text", "error", "date", "query"])
                    drafts.delete(`${entry.id}:${part}`);
                setClearEpoch((epoch) => epoch + 1);
              }
            }
          : undefined,
      content: section.entries.map((entry) => (
        <div key={entry.id} className="[&>div]:w-full">
          {!single && (
            <p className="border-t px-3 pt-3 text-xs font-medium first:border-t-0">
              {entry.field.label}
            </p>
          )}
          <FieldEditor
            key={`${entry.id}:${clearEpoch}`}
            entry={entry}
            active
            autoFocus={false}
            showDateLabel={false}
            disabled={disabled || entry.field.disabled}
            close={() => filters.setMenuOpen(false)}
            location="menu"
          />
        </div>
      )),
    };
  });
  return (
    <FilterDraftCache.Provider value={drafts}>
      <FilterMenuPanel
        sections={sections}
        selectedId={filters.openField}
        onSelect={filters.setOpenField}
        onClose={() => filters.setMenuOpen(false)}
        anchor={anchor}
        trigger={trigger}
      />
    </FilterDraftCache.Provider>
  );
}
export function FilterList() {
  const { filters, suggestions } = useRoot();
  return (
    <>
      {filters.entries.flatMap((entry) =>
        !entry.field.hidden &&
        (entry.field.isActive(entry.value) ||
          showSuggestion(entry, suggestions, filters.active.length))
          ? [<FieldChip key={entry.id} entry={entry} />]
          : [],
      )}
    </>
  );
}
function summarize(field: RuntimeField, value: unknown, choices: Choice[]): string {
  if (field.kind === "numberRange" && Array.isArray(value))
    return `${value[0] ?? "Any"} – ${value[1] ?? "Any"}`;
  if (Array.isArray(value)) {
    const labels = new Map(choices.map((choice) => [choice.value, choice.label]));
    return value.map((item) => labels.get(item) ?? String(item ?? "Any")).join(", ");
  }
  if (value && typeof value === "object" && "from" in value && "to" in value)
    return `${value.from ?? "Any"} – ${value.to ?? "Any"}`;
  return choices.find((choice) => choice.value === value)?.label ?? String(value ?? "");
}
export function FilterField({ id }: { id: string }) {
  const { filters } = useRoot();
  const entry = filters.entries.find((entry) => entry.id === id);
  return entry ? <FieldChip entry={entry} /> : null;
}

/** Place a built-in or custom field editor in an application-defined layout. */
export function FilterFieldEditor({ id, autoFocus = true }: { id: string; autoFocus?: boolean }) {
  const { filters, disabled } = useRoot();
  const entry = filters.entries.find((entry) => entry.id === id);
  return entry ? (
    <FieldEditor
      key={id}
      entry={entry}
      active
      autoFocus={autoFocus}
      disabled={disabled || entry.field.disabled}
      close={() => filters.edit(null)}
      location="inline"
    />
  ) : null;
}
function FieldChip({ entry }: { entry: FilterEntry }) {
  const { classNames } = useMendyUI();
  const { filters, summary, suggestions, disabled, trigger } = useRoot();
  const { id, field, value } = entry;
  const descriptionId = useId();
  const active = field.isActive(value);
  const currentlyActive = useRef(active);
  useLayoutEffect(() => {
    currentlyActive.current = active;
  }, [active]);
  const suggestion = showSuggestion(entry, suggestions, filters.active.length);
  const options = useFilterOptions(id, field, active ? value : field.suggestion?.value, false);
  if (field.hidden || (!active && !suggestion)) return null;
  return (
    <AppliedFilter
      label={field.label}
      data-mendy-ui=""
      data-slot={active ? "filter-chip" : "filter-suggestion"}
      data-state={active ? "applied" : "suggested"}
      className={cn(
        !active && "border border-dashed border-muted-foreground/50 bg-transparent",
        (field.summary ?? summary).mode === "all" && "h-auto min-h-9",
        classNames?.chip,
      )}
      disabled={chipDisabled(field, active, disabled)}
      removeProps={{ className: classNames?.chipRemove }}
      contentProps={{
        className: classNames?.editor,
        onCloseAutoFocus: (event) => {
          if (!currentlyActive.current) {
            event.preventDefault();
            trigger.current?.focus();
          }
        },
      }}
      triggerProps={{ "aria-describedby": descriptionId, className: classNames?.chipTrigger }}
      editLabel={`${active ? "Edit" : "Apply"} ${field.label} filter`}
      open={filters.editField === id}
      onOpenChange={(open) => {
        if (open && !active && field.suggestion && "value" in field.suggestion) {
          filters.commit(id, field.suggestion.value, "suggestion");
          return;
        }
        filters.edit(open ? id : null);
      }}
      onRemove={
        active && field.removable !== false
          ? () => {
              filters.remove(id);
              requestAnimationFrame(() => trigger.current?.focus());
            }
          : undefined
      }
      editor={
        <FieldEditor
          entry={entry}
          active={filters.editField === id}
          disabled={disabled || field.disabled}
          close={() => filters.edit(null)}
          location="chip"
        />
      }
    >
      <span id={descriptionId} className="sr-only">
        {summarize(field, active ? value : field.suggestion?.value, options.selected)}
      </span>
      <ChipSummary
        field={field}
        value={value}
        active={active}
        options={options}
        summary={summary}
      />
    </AppliedFilter>
  );
}
function showSuggestion(entry: FilterEntry, mode: RootContext["suggestions"], activeCount: number) {
  return (
    !entry.field.isActive(entry.value) &&
    entry.field.suggestion &&
    !entry.field.hidden &&
    mode !== "never" &&
    (mode === "always" || activeCount === 0)
  );
}
function chipDisabled(field: RuntimeField, active: boolean, disabled: boolean) {
  return (
    disabled ||
    field.disabled ||
    (!active && (field.suggestion?.disabled || field.suggestion?.loading))
  );
}
function summaryText(
  field: RuntimeField,
  shownValue: unknown,
  choices: Choice[],
  policy: SummaryPolicy,
) {
  const full = summarize(field, shownValue, choices);
  let text = full;
  if (policy.mode === "count" && field.kind !== "numberRange" && Array.isArray(shownValue)) {
    const limit = Math.max(0, policy.limit ?? 3);
    if (shownValue.length > limit)
      text = `${summarize(field, shownValue.slice(0, limit), choices)}${limit ? " and " : ""}${shownValue.length - limit} more`;
  }
  return text;
}
function ChipSummary({
  field,
  value,
  active,
  options,
  summary,
}: {
  field: RuntimeField;
  value: unknown;
  active: boolean;
  options: ReturnType<typeof useFilterOptions>;
  summary: SummaryPolicy;
}) {
  const policy = field.summary ?? summary;
  const shownValue = active ? value : field.suggestion?.value;
  const full = summarize(field, shownValue, options.selected);
  const text = summaryText(field, shownValue, options.selected, policy);
  return (
    <>
      <span
        className={cn("min-w-0 shrink truncate [unicode-bidi:isolate]", full && "max-w-[60%]")}
        title={field.label}
        dir="auto"
      >
        {!active && field.suggestion?.label ? field.suggestion.label : field.label}
        {full ? ":" : ""}
      </span>
      {field.renderSummary ? (
        field.renderSummary(shownValue, options.selected)
      ) : (
        <span
          title={full}
          dir="auto"
          className={cn(
            "min-w-0 text-foreground [overflow-wrap:anywhere] [unicode-bidi:isolate]",
            policy.mode !== "all" && "truncate",
            policy.mode === "all" && "whitespace-normal break-words py-1",
          )}
          style={policy.mode === "ellipsis" ? { maxWidth: policy.maxWidth ?? 180 } : undefined}
        >
          {options.resolving ? <span className="animate-pulse">{text || "Loading…"}</span> : text}
        </span>
      )}
    </>
  );
}
export function FilterClear({ children = "Clear all" }: { children?: ReactNode }) {
  const { classNames } = useMendyUI();
  const { filters, disabled, trigger, setAmbiguous } = useRoot();
  if (!filters.active.length && !filters.search) return null;
  return (
    <Button
      type="button"
      disabled={disabled}
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 px-2 font-normal text-muted-foreground underline hover:bg-transparent",
        classNames?.clear,
      )}
      onClick={() => {
        setAmbiguous([]);
        filters.clear();
        requestAnimationFrame(() => trigger.current?.focus());
      }}
    >
      {children}
    </Button>
  );
}
export function FilterFeedback() {
  const { filters, ambiguous, setAmbiguous } = useRoot();
  return (
    <>
      {filters.error && !filters.menuOpen && !filters.editField && (
        <p role="alert" className="w-full text-sm text-destructive">
          {filters.error}
        </p>
      )}
      {filters.persistenceMessage && (
        <p role="status" className="w-full text-xs text-muted-foreground">
          {filters.persistenceMessage}
        </p>
      )}
      {ambiguous.map((item) => (
        <div
          data-mendy-ui=""
          key={item.token}
          className="flex w-full flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
        >
          <span>Use {item.token} as:</span>
          {item.candidates.map((candidate) => (
            <Button
              key={candidate.id}
              size="sm"
              variant="outline"
              onClick={() => {
                const entry = filters.entries.find((entry) => entry.id === candidate.id)!;
                const resolved = resolvePasteAmbiguity(filters.search, item, ambiguous);
                const error = filters.batch(
                  { [candidate.id]: entry.field.merge(entry.value, candidate.value) },
                  resolved.search,
                  "paste",
                );
                if (!error) setAmbiguous(resolved.remaining);
              }}
            >
              {candidate.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAmbiguous(ambiguous.filter((other) => other !== item))}
          >
            Keep in search
          </Button>
        </div>
      ))}
    </>
  );
}
function FieldEditor({
  entry,
  active,
  disabled,
  close,
  location,
  autoFocus = true,
  showDateLabel = true,
}: {
  autoFocus?: boolean;
  showDateLabel?: boolean;
  entry: FilterEntry;
  active: boolean;
  disabled?: boolean;
  close(): void;
  location: "menu" | "chip" | "inline";
}) {
  const { filters, trigger, closeMenuOnApply } = useRoot();
  const { field, value } = entry;
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const customRoot = useRef<HTMLDivElement>(null);
  const [draft, updateDraft] = useValueDraft(value, (current) => current, `${entry.id}:value`);
  const draftRef = useRef(value);
  useLayoutEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  function setDraft(next: unknown) {
    draftRef.current = next;
    updateDraft(next);
  }
  const [text, setText] = useValueDraft(
    value,
    (value) =>
      field.kind === "tokens"
        ? Array.isArray(value)
          ? value.join(", ")
          : ""
        : typeof value === "string"
          ? value
          : "",
    `${entry.id}:text`,
  );
  const [error, setError] = useValueDraft<unknown, string | undefined>(
    value,
    () => undefined,
    `${entry.id}:error`,
  );
  const id = useId();
  const options = useFilterOptions(entry.id, field, value, active);
  useEffect(() => {
    if (!active || !autoFocus) return;
    const frame = requestAnimationFrame(() =>
      (
        input.current ??
        customRoot.current?.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]',
        )
      )?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [active, autoFocus]);
  function apply(next: unknown, shouldClose = true) {
    if (disabled) return;
    const problem = filters.commit(entry.id, next);
    setError(problem);
    if (!problem) {
      setDraft(field.normalize(next));
      const dismiss =
        location === "menu"
          ? (field.closeMenuOnApply ?? closeMenuOnApply)
          : shouldClose || !field.isActive(field.normalize(next));
      if (dismiss) close();
    }
    if (!problem && !field.isActive(field.normalize(next)) && location === "chip")
      requestAnimationFrame(() => trigger.current?.focus());
  }
  if (field.renderEditor)
    return (
      <div
        data-mendy-ui=""
        ref={customRoot}
        className="max-w-[calc(100vw-2rem)] p-3"
        onKeyDown={(event) => {
          if (event.key === "Escape") return;
          if (
            event.key === "Tab" ||
            (event.target instanceof HTMLElement &&
              event.target.matches("input, textarea, select, [contenteditable=true]"))
          )
            event.stopPropagation();
        }}
      >
        {field.renderEditor({
          value,
          draft,
          setDraft,
          setValue: (next) => apply(next, false),
          apply: (next = draftRef.current) => apply(next),
          close,
        })}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  if (field.kind === "single" || field.kind === "multi")
    return (
      <ChoiceEditor
        field={field}
        value={value}
        input={input}
        options={options}
        error={error}
        disabled={disabled}
        apply={apply}
        location={location}
      />
    );
  if (field.kind === "dateRange")
    return (
      <FilterDateEditor
        draftKey={`${entry.id}:date`}
        autoFocus={autoFocus}
        showLabel={showDateLabel}
        showClear={location !== "menu"}
        field={field}
        value={value}
        disabled={disabled}
        apply={apply}
        error={error}
      />
    );
  return (
    <ValueEditor
      location={location}
      field={field}
      draft={draft}
      setDraft={setDraft}
      text={text}
      setText={setText}
      input={input}
      error={error}
      id={id}
      disabled={disabled}
      apply={apply}
    />
  );
}
interface CommitEditorProps {
  field: RuntimeField;
  disabled?: boolean;
  input: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  apply(value: unknown, shouldClose?: boolean): void;
}
function useChoiceSearch(field: RuntimeField, count: number) {
  const large = (field.source?.items.length ?? 0) > 100 || count > 100;
  const [discovered, setDiscovered] = useState(large);
  if (large && !discovered) setDiscovered(true);
  return field.searchable || large || discovered;
}

function ChoiceEditor({
  field,
  value,
  input,
  options,
  disabled,
  apply,
  location,
  error,
}: CommitEditorProps & {
  value: unknown;
  error?: string;
  options: ReturnType<typeof useFilterOptions>;
  location: "menu" | "chip" | "inline";
}) {
  const searchable = useChoiceSearch(field, options.items.length);
  const collection = useRef<CollectionHandle>(null);
  const selected = Array.isArray(value) ? value : value === null ? [] : [value];
  const selectedSet = new Set(selected);
  const searchLabel = field.searchLabel ?? `Search ${field.label.toLowerCase()}`;
  return (
    <div
      data-mendy-ui=""
      data-filter-choices=""
      className="w-64 max-w-full"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      {searchable && (
        <div data-mendy-ui="" className="relative border-b p-2">
          <Search
            className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={(node) => {
              input.current = node;
            }}
            aria-label={searchLabel}
            type="search"
            disabled={disabled}
            placeholder={searchLabel}
            value={options.query}
            className="ps-8 sm:pointer-fine:h-8 [&::-webkit-search-cancel-button]:appearance-none"
            onChange={(event) => options.setQuery(event.target.value)}
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
      <ChoiceCollection
        field={field}
        options={options}
        value={value}
        selected={selected}
        selectedSet={selectedSet}
        disabled={disabled}
        apply={apply}
        location={location}
        collection={collection}
      />
      <OptionFeedback options={options} error={error} />
    </div>
  );
}
function ChoiceCollection({
  field,
  options,
  value,
  selected,
  selectedSet,
  disabled,
  apply,
  location,
  collection,
}: {
  field: RuntimeField;
  options: ReturnType<typeof useFilterOptions>;
  value: unknown;
  selected: unknown[];
  selectedSet: Set<unknown>;
  disabled?: boolean;
  apply(value: unknown, shouldClose?: boolean): void;
  location: "menu" | "chip" | "inline";
  collection: React.RefObject<CollectionHandle | null>;
}) {
  const { classNames } = useMendyUI();
  const choices = (
    field.kind === "single" && location === "chip" && field.removable !== false
      ? [{ value: "", label: `Any ${field.label.toLowerCase()}` }, ...options.items]
      : options.items
  ).map((choice) => ({ ...choice, key: choice.value, disabled: disabled || choice.disabled }));
  const list = (
    <FilterCollection
      items={choices}
      role={location === "inline" ? "group" : "menu"}
      label={field.label}
      collectionRef={collection}
      initialKey={typeof selected[0] === "string" ? selected[0] : undefined}
      className="max-h-[min(20rem,var(--radix-dropdown-menu-content-available-height,20rem))]"
    >
      {(choice, index, row) => {
        const content =
          field.renderOption && choice.value !== ""
            ? field.renderOption(choice, { selected: selectedSet.has(choice.value) })
            : choice.label;
        const common = {
          ...row,
          "aria-label": choice.label,
          disabled: choice.disabled,
          className: cn(
            "items-start py-2 sm:pointer-fine:py-1.5 whitespace-normal [overflow-wrap:anywhere] [&>span:first-child]:mt-[calc(0.5lh-0.4375rem)]",
            classNames?.option,
          ),
        };
        if (location === "inline")
          return (
            <Button
              key={choice.key}
              {...common}
              variant="ghost"
              type="button"
              aria-pressed={selectedSet.has(choice.value)}
              className={cn(
                "h-auto min-h-9 w-full justify-start whitespace-normal [overflow-wrap:anywhere] text-start",
                selectedSet.has(choice.value) && "bg-accent",
                classNames?.option,
              )}
              onClick={() => {
                if (field.kind === "single") apply(choice.value, false);
                else {
                  const next = selectedSet.has(choice.value)
                    ? selected.filter((item) => item !== choice.value)
                    : [...selected, choice.value];
                  apply(next.length ? next : field.clearValue, false);
                }
              }}
            >
              {content}
            </Button>
          );
        const position =
          choices.length > 100
            ? { "aria-posinset": index + 1, "aria-setsize": choices.length }
            : {};
        if (field.kind === "single")
          return (
            <DropdownMenuRadioItem
              key={choice.key}
              {...common}
              {...position}
              value={choice.value}
              onSelect={(event) => event.preventDefault()}
            >
              {content}
            </DropdownMenuRadioItem>
          );
        return (
          <FilterCheckboxItem
            key={choice.key}
            {...common}
            {...position}
            checked={selectedSet.has(choice.value)}
            onCheckedChange={(checked) => {
              const next = checked
                ? [...new Set([...selected, choice.value])]
                : selected.filter((item) => item !== choice.value);
              apply(next.length ? next : field.clearValue, false);
            }}
          >
            {content}
          </FilterCheckboxItem>
        );
      }}
    </FilterCollection>
  );
  return field.kind === "single" && location !== "inline" ? (
    <DropdownMenuRadioGroup
      value={typeof value === "string" ? value : ""}
      onValueChange={(next) => apply(next || field.clearValue)}
    >
      {list}
    </DropdownMenuRadioGroup>
  ) : (
    list
  );
}

function OptionFeedback({
  options,
  error,
}: {
  options: ReturnType<typeof useFilterOptions>;
  error?: string;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {options.loading && (
        <p role="status" className="px-3 py-2 text-sm text-muted-foreground">
          Loading options…
        </p>
      )}
      {!options.loading && !options.error && options.items.length === 0 && (
        <p role="status" className="p-3 text-sm text-muted-foreground">
          No options found.
        </p>
      )}
      {options.error && (
        <div data-mendy-ui="" className="space-y-2 p-3">
          <p role="alert" className="text-sm text-destructive">
            {options.error}
          </p>
          <Button size="sm" variant="outline" onClick={options.retry}>
            Retry
          </Button>
        </div>
      )}
      {options.hasMore && (
        <Button
          variant="ghost"
          className="w-full"
          disabled={options.loading}
          onClick={options.loadMore}
        >
          Load more
        </Button>
      )}
    </>
  );
}
function ValueEditor({
  location,
  field,
  draft,
  setDraft,
  text,
  setText,
  input,
  error,
  id,
  disabled,
  apply,
}: CommitEditorProps & {
  location: "menu" | "chip" | "inline";
  draft: unknown;
  setDraft(value: unknown): void;
  text: string;
  setText(value: string): void;
  error?: string;
  id: string;
}) {
  const [attempted, setAttempted] = useState(false);
  const candidate =
    field.kind === "tokens"
      ? text.split(/[\r\n\t,]+/).flatMap((item) => (item.trim() ? [item.trim()] : []))
      : field.kind === "text"
        ? text
        : draft;
  let validation: string | undefined;
  try {
    validation = field.validate(field.normalize(candidate));
  } catch {
    validation = "Enter a valid value.";
  }
  const message =
    (text.length > 0 || attempted || field.kind === "numberRange" ? validation : undefined) ??
    error;
  return (
    <div
      data-mendy-ui=""
      className="w-72 max-w-full space-y-2 p-3"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      {field.kind === "numberRange" ? (
        <fieldset disabled={disabled} className="m-0 min-w-0 space-y-2 border-0 p-0">
          <legend className={cn("p-0 text-sm font-medium", location === "menu" && "sr-only")}>
            {field.label}
          </legend>
          {[0, 1].map((index) => {
            const key = index === 0 ? "from" : "to";
            const rangeValue = (draft as (number | null)[] | null)?.[index];
            return (
              <Label key={key} className="block space-y-1 text-xs">
                {index === 0 ? "Minimum" : "Maximum"}
                <Input
                  ref={
                    index === 0
                      ? (node) => {
                          input.current = node;
                        }
                      : undefined
                  }
                  aria-invalid={Boolean(message)}
                  aria-describedby={message ? `${id}-error` : `${id}-hint`}
                  type="number"
                  value={rangeValue ?? ""}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
                  }}
                  onChange={(event) => {
                    // An unfinished minus sign or exponent is not an intentional clear.
                    if (event.target.validity.badInput) return;
                    const next = event.target.value || null;
                    const range = [...((draft as (number | null)[] | null) ?? [null, null])];
                    range[index] = next === null ? null : Number(next);
                    setDraft(range);
                    apply(range, false);
                  }}
                />
              </Label>
            );
          })}
        </fieldset>
      ) : (
        <>
          <Label
            htmlFor={id}
            className={cn(
              "text-sm font-medium",
              location === "menu" && "text-xs font-normal text-muted-foreground",
            )}
          >
            {field.searchLabel ?? field.label}
          </Label>
          <Textarea
            className="resize-y"
            id={id}
            ref={(node) => {
              input.current = node;
            }}
            disabled={disabled}
            placeholder={field.placeholder}
            value={text}
            aria-invalid={Boolean(message)}
            aria-describedby={message ? `${id}-error` : `${id}-hint`}
            onChange={(event) => {
              setAttempted(false);
              setText(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                setAttempted(true);
                if (!validation) apply(candidate);
              }
              if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
            }}
          />
        </>
      )}
      <ValueEditorFeedback message={message} id={id} hasHint={field.kind !== "numberRange"} />
    </div>
  );
}

function ValueEditorFeedback({
  message,
  id,
  hasHint,
}: {
  message?: string;
  id: string;
  hasHint: boolean;
}) {
  if (message)
    return (
      <p role="alert" id={`${id}-error`} className="text-xs text-destructive">
        {message}
      </p>
    );
  if (!hasHint) return null;
  return (
    <p id={`${id}-hint`} className="text-xs text-muted-foreground">
      Enter to save. Shift+Enter for a new line.
    </p>
  );
}
