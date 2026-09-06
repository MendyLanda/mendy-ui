"use client";

import type { ReactNode } from "react";
import type { Choice, RuntimeField, SummaryPolicy } from "@/registry/new-york/filter-definition";
import type { FilterController } from "@/registry/new-york/use-filters";
import type { FilterEntry, PasteAmbiguity } from "@/registry/new-york/filter-state";
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
import { ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { AppliedFilter, FilterCheckboxItem, FilterMenuItem } from "@/registry/new-york/filters";
import { FilterOptionCache, useFilterOptions } from "@/registry/new-york/use-filter-options";
import { classifyPaste, resolvePasteAmbiguity } from "@/registry/new-york/filter-state";
import { cn } from "@/lib/utils";

export interface FilterMenuGroup {
  id: string;
  label: string;
  fields: string[];
}
interface RootContext {
  filters: FilterController;
  summary: SummaryPolicy;
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
  filters: FilterController;
  summary?: SummaryPolicy;
  suggestions?: "when-empty" | "always" | "never";
  groups?: FilterMenuGroup[];
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}
export function FilterRoot({
  filters,
  summary = defaultSummary,
  suggestions = "when-empty",
  groups = defaultGroups,
  disabled = false,
  className,
  children,
}: FilterRootProps) {
  const [cache] = useState(() => new Map());
  const [ambiguous, setAmbiguous] = useState<PasteAmbiguity[]>([]);
  const trigger = useRef<HTMLButtonElement>(null);
  const context = useMemo(
    () => ({ filters, summary, suggestions, groups, disabled, trigger, ambiguous, setAmbiguous }),
    [filters, summary, suggestions, groups, disabled, ambiguous],
  );
  return (
    <FilterOptionCache.Provider value={cache}>
      <Context.Provider value={context}>
        <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
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
  const { filters, trigger, disabled, setAmbiguous } = useRoot();
  const input = useRef<HTMLInputElement>(null);
  const shift = useRef(false);
  return (
    <DropdownMenu open={filters.menuOpen} onOpenChange={filters.setMenuOpen}>
      <div className="relative w-full shrink-0 sm:w-[350px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2"
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
            "w-full rounded-none pl-9 text-sm [&::-webkit-search-cancel-button]:appearance-none",
            filters.search ? "pr-16" : "pr-9",
          )}
          onKeyDown={(event) => {
            shift.current = event.shiftKey;
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
          <button
            type="button"
            disabled={disabled}
            aria-label="Clear search"
            className="absolute right-8 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm opacity-50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={() => {
              setAmbiguous([]);
              filters.setSearch("");
              input.current?.focus();
            }}
          >
            <X className="size-[15px]" aria-hidden="true" />
          </button>
        )}
        <DropdownMenuTrigger asChild>
          <button
            ref={trigger}
            type="button"
            disabled={disabled}
            aria-label="Open filters"
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 rounded-sm transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:opacity-100",
              filters.active.length ? "opacity-100" : "opacity-50",
            )}
          >
            <ListFilter className="size-[17px]" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
      </div>
      <FilterMenuContent />
    </DropdownMenu>
  );
}
/** A standalone menu button for layouts without a search field. */
export function FilterMenu({ children = "Add filter" }: { children?: ReactNode }) {
  const { filters, trigger, disabled } = useRoot();
  return (
    <DropdownMenu open={filters.menuOpen} onOpenChange={filters.setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} variant="outline" disabled={disabled}>
          {children}
        </Button>
      </DropdownMenuTrigger>
      <FilterMenuContent />
    </DropdownMenu>
  );
}
function FilterMenuContent() {
  const { filters, groups } = useRoot();
  const grouped = new Set(groups.flatMap((group) => group.fields));
  return (
    <DropdownMenuContent
      inert={!filters.menuOpen}
      aria-hidden={!filters.menuOpen || undefined}
      align="end"
      sideOffset={12}
      alignOffset={-12}
      loop
      className="w-[min(350px,calc(100vw-2rem))]"
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
    >
      {filters.entries.flatMap((entry) =>
        !entry.field.hidden && !grouped.has(entry.id)
          ? [<MenuRow key={entry.id} id={entry.id} label={entry.field.label} entries={[entry]} />]
          : [],
      )}
      {groups.map((group) => (
        <MenuRow
          key={group.id}
          id={group.id}
          label={group.label}
          entries={filters.entries.filter(
            (entry) => group.fields.includes(entry.id) && !entry.field.hidden,
          )}
        />
      ))}
    </DropdownMenuContent>
  );
}
function MenuRow({ id, label, entries }: { id: string; label: string; entries: FilterEntry[] }) {
  const { filters, disabled } = useRoot();
  const [epoch, setEpoch] = useState(0);
  if (!entries.length) return null;
  const single = entries.length === 1 ? entries[0]!.field : undefined;
  const ariaLabel =
    single?.editorLabel ??
    (single?.kind === "text" || single?.kind === "tokens"
      ? `Set ${label.toLowerCase()} filter`
      : `Choose ${label.toLowerCase()}`);
  return (
    <FilterMenuItem
      label={label}
      open={filters.openField === id && filters.menuOpen}
      onOpenChange={(open) => {
        filters.setOpenField(open ? id : null);
        if (open) setEpoch((value) => value + 1);
      }}
      contentProps={{
        role: "dialog",
        "aria-label": ariaLabel,
        "aria-orientation": undefined,
        inert: !filters.menuOpen,
        "aria-hidden": !filters.menuOpen || undefined,
      }}
    >
      {entries.map((entry) => (
        <div key={entry.id}>
          {entries.length > 1 && (
            <p className="border-t px-3 pt-3 text-xs font-medium">{entry.field.label}</p>
          )}
          <FieldEditor
            key={`${entry.id}:${epoch}`}
            entry={entry}
            active={filters.menuOpen && filters.openField === id}
            disabled={disabled || entry.field.disabled}
            close={() => filters.setMenuOpen(false)}
            location="menu"
          />
        </div>
      ))}
    </FilterMenuItem>
  );
}
export function FilterList() {
  const { filters } = useRoot();
  return (
    <>
      {filters.entries.map((entry) => (
        <FieldChip key={entry.id} entry={entry} />
      ))}
    </>
  );
}
function summarize(field: RuntimeField, value: unknown, choices: Choice[]): string {
  if (field.kind === "numberRange" && Array.isArray(value))
    return `${value[0] ?? "Any"} – ${value[1] ?? "Any"}`;
  if (Array.isArray(value))
    return value
      .map(
        (item) => choices.find((choice) => choice.value === item)?.label ?? String(item ?? "Any"),
      )
      .join(", ");
  if (value && typeof value === "object" && "from" in value && "to" in value)
    return `${value.from ?? "Any"} – ${value.to ?? "Any"}`;
  return choices.find((choice) => choice.value === value)?.label ?? String(value ?? "");
}
function FieldChip({ entry }: { entry: FilterEntry }) {
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
      data-slot={active ? "filter-chip" : "filter-suggestion"}
      data-state={active ? "applied" : "suggested"}
      className={cn(
        !active && "border border-dashed border-muted-foreground/50 bg-transparent",
        (field.summary ?? summary).mode === "all" && "h-auto min-h-9",
      )}
      disabled={chipDisabled(field, active, disabled)}
      contentProps={{
        onCloseAutoFocus: (event) => {
          if (!currentlyActive.current) {
            event.preventDefault();
            trigger.current?.focus();
          }
        },
      }}
      triggerProps={{ "aria-describedby": descriptionId }}
      editLabel={`${active ? "Edit" : "Apply"} ${field.label} filter`}
      open={filters.editField === id}
      onOpenChange={(open) => {
        if (open && !active && field.suggestion && "value" in field.suggestion) {
          const error = filters.commit(id, field.suggestion.value, "suggestion");
          if (error) return;
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
      <span>
        {!active && field.suggestion?.label ? field.suggestion.label : field.label}
        {full ? ":" : ""}
      </span>
      {field.renderSummary ? (
        field.renderSummary(shownValue, options.selected)
      ) : (
        <span
          title={full}
          className={cn(
            "min-w-0",
            policy.mode === "ellipsis" && "truncate",
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
  const { filters, disabled, trigger, setAmbiguous } = useRoot();
  if (!filters.active.length && !filters.search) return null;
  return (
    <Button
      type="button"
      disabled={disabled}
      variant="ghost"
      size="sm"
      className="h-9 rounded-none px-2 font-normal text-muted-foreground underline hover:bg-transparent"
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
          key={item.token}
          className="flex w-full flex-wrap items-center gap-2 rounded border p-2 text-sm"
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
}: {
  entry: FilterEntry;
  active: boolean;
  disabled?: boolean;
  close(): void;
  location: "menu" | "chip";
}) {
  const { filters, trigger } = useRoot();
  const { field, value } = entry;
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const customRoot = useRef<HTMLDivElement>(null);
  const [draft, updateDraft] = useState(value);
  const draftRef = useRef(value);
  function setDraft(next: unknown) {
    draftRef.current = next;
    updateDraft(next);
  }
  const [text, setText] = useState(() =>
    field.kind === "tokens"
      ? Array.isArray(value)
        ? value.join(", ")
        : ""
      : typeof value === "string"
        ? value
        : "",
  );
  const [error, setError] = useState<string>();
  const id = useId();
  const options = useFilterOptions(entry.id, field, value, active);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() =>
      (
        input.current ??
        customRoot.current?.querySelector<HTMLElement>(
          'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]',
        )
      )?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [active]);
  function apply(next: unknown, shouldClose = true) {
    if (disabled) return;
    const problem = filters.commit(entry.id, next);
    setError(problem);
    if (!problem) {
      setDraft(field.normalize(next));
      if (shouldClose || !field.isActive(field.normalize(next))) close();
    }
    if (!problem && !field.isActive(field.normalize(next)) && location === "chip")
      requestAnimationFrame(() => trigger.current?.focus());
  }
  if (field.renderEditor)
    return (
      <div
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
  return (
    <ValueEditor
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
  location: "menu" | "chip";
}) {
  const selected = Array.isArray(value) ? value : value === null ? [] : [value];
  const selectedSet = new Set(selected);
  const searchLabel = field.searchLabel ?? `Search ${field.label.toLowerCase()}`;
  return (
    <div
      className="w-64 max-w-full"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      {field.searchable && (
        <div className="flex items-center border-b focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring">
          <Search
            className="mx-2 size-4 shrink-0 opacity-50"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            ref={(node) => {
              input.current = node;
            }}
            aria-label={searchLabel}
            type="search"
            disabled={disabled}
            placeholder={searchLabel}
            value={options.query}
            className="h-10 min-w-0 w-full bg-transparent px-3 py-3 text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none"
            onChange={(event) => options.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                event.currentTarget
                  .closest("[data-radix-menu-content]")
                  ?.querySelector<HTMLElement>('[role^="menuitem"]:not([data-disabled])')
                  ?.focus();
              }
              if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
            }}
          />
        </div>
      )}
      <div role="menu" aria-label={field.label} className="p-1">
        {field.kind === "single" ? (
          <DropdownMenuRadioGroup
            value={typeof value === "string" ? value : ""}
            onValueChange={(next) => apply(next || field.clearValue)}
          >
            {location === "chip" && field.removable !== false && (
              <DropdownMenuRadioItem
                value=""
                disabled={disabled}
                onSelect={(event) => event.preventDefault()}
              >
                Any {field.label.toLowerCase()}
              </DropdownMenuRadioItem>
            )}
            {options.items.map((choice) => (
              <DropdownMenuRadioItem
                key={choice.value}
                value={choice.value}
                onSelect={(event) => event.preventDefault()}
                disabled={disabled || choice.disabled}
              >
                {choice.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        ) : (
          options.items.map((choice) => (
            <FilterCheckboxItem
              key={choice.value}
              disabled={disabled || choice.disabled}
              checked={selectedSet.has(choice.value)}
              onCheckedChange={(checked) => {
                const next = checked
                  ? [...new Set([...selected, choice.value])]
                  : selected.filter((item) => item !== choice.value);
                apply(next.length ? next : field.clearValue, false);
              }}
            >
              {choice.label}
            </FilterCheckboxItem>
          ))
        )}
      </div>
      <OptionFeedback options={options} error={error} />
    </div>
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
        <div className="space-y-2 p-3">
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
  draft: unknown;
  setDraft(value: unknown): void;
  text: string;
  setText(value: string): void;
  error?: string;
  id: string;
}) {
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
  return (
    <div
      className="w-72 max-w-full space-y-2 p-3"
      onKeyDown={(event) => {
        if (event.key === "Tab") event.stopPropagation();
      }}
    >
      {field.kind === "numberRange" || field.kind === "dateRange" ? (
        <fieldset disabled={disabled} className="space-y-2">
          <legend className="text-sm font-medium">{field.label}</legend>
          {[0, 1].map((index) => {
            const dates = field.kind === "dateRange";
            const key = index === 0 ? "from" : "to";
            const rangeValue = dates
              ? (draft as { from?: string; to?: string } | null)?.[key]
              : (draft as (number | null)[] | null)?.[index];
            return (
              <label key={key} className="block space-y-1 text-xs">
                {dates
                  ? index === 0
                    ? "Start date"
                    : "End date"
                  : index === 0
                    ? "Minimum"
                    : "Maximum"}
                <Input
                  ref={
                    index === 0
                      ? (node) => {
                          input.current = node;
                        }
                      : undefined
                  }
                  aria-invalid={Boolean(validation || error)}
                  aria-describedby={validation || error ? `${id}-error` : undefined}
                  type={dates ? "date" : "number"}
                  value={rangeValue ?? ""}
                  onKeyDown={(event) => {
                    if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
                  }}
                  onChange={(event) => {
                    const next = event.target.value || null;
                    if (dates)
                      setDraft({
                        ...((draft as object | null) ?? { from: null, to: null }),
                        [key]: next,
                      });
                    else {
                      const range = [...((draft as (number | null)[] | null) ?? [null, null])];
                      range[index] = next === null ? null : Number(next);
                      setDraft(range);
                    }
                  }}
                />
              </label>
            );
          })}
        </fieldset>
      ) : (
        <>
          <label htmlFor={id} className="text-sm font-medium">
            {field.searchLabel ?? field.label}
          </label>
          <Textarea
            id={id}
            ref={(node) => {
              input.current = node;
            }}
            disabled={disabled}
            placeholder={field.placeholder}
            value={text}
            aria-invalid={Boolean(validation || error)}
            aria-describedby={validation || error ? `${id}-error` : undefined}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (field.kind === "text" && event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!validation) apply(candidate);
              }
              if (event.key !== "Escape" && event.key !== "Tab") event.stopPropagation();
            }}
          />
        </>
      )}
      {(validation || error) && (
        <p role="alert" id={`${id}-error`} className="text-sm text-destructive">
          {validation ?? error}
        </p>
      )}
      <Button
        type="button"
        size="sm"
        disabled={disabled || Boolean(validation)}
        onClick={() => apply(candidate)}
      >
        Apply
      </Button>
    </div>
  );
}
