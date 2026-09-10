import type { ReactNode } from "react";

export interface FilterCodec<V> {
  parse(raw: string): V | null;
  serialize(value: V): string;
}
export type SummaryPolicy =
  | { mode: "count"; limit?: number }
  | { mode: "ellipsis"; maxWidth?: number }
  | { mode: "all" };
export interface Choice {
  value: string;
  label: string;
  disabled?: boolean;
  data?: unknown;
}
export interface OptionPage<T> {
  items: readonly T[];
  cursor?: string | null;
}
export interface RemoteOptions<T, P = unknown> {
  kind: "remote";
  scope: string;
  params: P;
  search(input: {
    query: string;
    cursor?: string;
    params: P;
    signal: AbortSignal;
  }): Promise<OptionPage<T>>;
  resolve(input: { ids: string[]; params: P; signal: AbortSignal }): Promise<readonly T[]>;
  getValue(item: T): string;
  getLabel(item: T): string;
  debounceMs?: number;
}
export function remoteOptions<T, P>(
  source: Omit<RemoteOptions<T, P>, "kind">,
): RemoteOptions<T, P> {
  return { ...source, kind: "remote" };
}
export interface ExternalOptions<T> {
  kind: "external";
  items: readonly T[];
  selectedItems?: readonly T[];
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  hasMore?: boolean;
  loadMore?: () => void;
}
export function externalOptions<T>(source: Omit<ExternalOptions<T>, "kind">): ExternalOptions<T> {
  return { ...source, kind: "external" };
}
export interface EditorContext<V> {
  /** False while the menu previews an editor. The menu focuses it on click or Enter. */
  autoFocus: boolean;
  location: "menu" | "chip" | "inline";
  value: V;
  setValue(value: V): void;
  close(): void;
  /** Change the local draft without applying it. */
  draft: V;
  setDraft(value: V): void;
  apply(value?: V): void;
}
export interface FieldConfig<V> {
  label: string;
  icon?: ReactNode;
  defaultValue?: V;
  clearValue?: V;
  isActive?: (value: V) => boolean;
  normalize?: (value: V) => V;
  validate?: (value: V) => string | undefined;
  codec?: FilterCodec<V>;
  suggestion?: { value?: V; label?: string; loading?: boolean; disabled?: boolean };
  /** Hide a redundant chip label, or use a shorter visible label. Accessible names stay intact. */
  chipLabel?: boolean | string;
  /** Place this editor beside its label inside a grouped menu. */
  menuLayout?: "stack" | "inline";
  editorPadding?: "default" | "none";
  summary?: SummaryPolicy;
  renderSummary?: (value: V, choices: readonly Choice[]) => ReactNode;
  renderEditor?: (context: EditorContext<V>) => ReactNode;
  recognize?: (token: string) => V | undefined;
  pastePriority?: number;
  merge?: (current: V, incoming: V) => V;
  urlKey?: string;
  /** Hide only the menu entry; recognition and chip editing remain available. */
  menu?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  removable?: boolean;
  closeMenuOnApply?: boolean;
  editorLabel?: string;
  searchLabel?: string;
  placeholder?: string;
}
export interface RuntimeSource {
  kind: "local" | "external" | "remote";
  items: Choice[];
  selectedItems?: Choice[];
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  hasMore?: boolean;
  loadMore?: () => void;
  scope?: string;
  params?: unknown;
  debounceMs?: number;
  search?: (
    query: string,
    cursor: string | undefined,
    signal: AbortSignal,
  ) => Promise<OptionPage<Choice>>;
  resolve?: (ids: string[], signal: AbortSignal) => Promise<readonly Choice[]>;
}
/** Runtime operations erase the value type only after the typed factory wraps callbacks. */
export interface RuntimeField {
  renderOption?: (choice: Choice, context: { selected: boolean }) => ReactNode;
  kind: "single" | "multi" | "text" | "tokens" | "numberRange" | "dateRange" | "custom";
  label: string;
  icon?: ReactNode;
  defaultValue: unknown;
  clearValue: unknown;
  isActive(value: unknown): boolean;
  normalize(value: unknown): unknown;
  validate(value: unknown): string | undefined;
  codec: FilterCodec<unknown>;
  suggestion?: { value?: unknown; label?: string; loading?: boolean; disabled?: boolean };
  /** Hide a redundant chip label, or use a shorter visible label. Accessible names stay intact. */
  chipLabel?: boolean | string;
  /** Place this editor beside its label inside a grouped menu. */
  menuLayout?: "stack" | "inline";
  editorPadding?: "default" | "none";
  summary?: SummaryPolicy;
  renderSummary?: (value: unknown, choices: readonly Choice[]) => ReactNode;
  renderEditor?: (context: EditorContext<unknown>) => ReactNode;
  recognize?: (token: string) => unknown;
  pastePriority: number;
  merge(current: unknown, incoming: unknown): unknown;
  urlKey?: string;
  source?: RuntimeSource;
  searchable?: boolean;
  /** Hide only the menu entry; recognition and chip editing remain available. */
  menu?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  removable?: boolean;
  closeMenuOnApply?: boolean;
  editorLabel?: string;
  searchLabel?: string;
  placeholder?: string;
}
export interface Field<V> extends RuntimeField {
  readonly valueType?: (value: V) => V;
}
export type FilterDefinitions = Record<string, RuntimeField>;
export type FilterValues<D extends FilterDefinitions> = {
  [K in keyof D]: D[K] extends Field<infer V> ? V : never;
};
export function defineFilters<const D extends FilterDefinitions>(definitions: D): D {
  return definitions;
}
export function valueIsActive(value: unknown): boolean {
  return (
    value !== null &&
    value !== undefined &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );
}
export function equalValues(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
export function jsonCodec<V>(accept: (value: unknown) => value is V): FilterCodec<V> {
  return {
    parse(raw) {
      try {
        const value: unknown = JSON.parse(raw);
        return accept(value) ? value : null;
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
  };
}
function makeField<V>(
  kind: RuntimeField["kind"],
  config: FieldConfig<V>,
  fallback: V,
  codec: FilterCodec<V>,
): Field<V> {
  const normalize = (value: unknown) => (config.normalize ? config.normalize(value as V) : value);
  return {
    ...config,
    kind,
    defaultValue: config.defaultValue === undefined ? fallback : config.defaultValue,
    clearValue: config.clearValue === undefined ? fallback : config.clearValue,
    normalize,
    isActive: (value) => (config.isActive ? config.isActive(value as V) : valueIsActive(value)),
    validate: (value) => config.validate?.(value as V),
    codec: {
      parse: (raw) => {
        const value = (config.codec ?? codec).parse(raw);
        return value === null ? null : normalize(value);
      },
      serialize: (value) => (config.codec ?? codec).serialize(value as V),
    },
    renderSummary: config.renderSummary
      ? (value, choices) => config.renderSummary!(value as V, choices)
      : undefined,
    renderEditor: config.renderEditor
      ? (context) => config.renderEditor!(context as EditorContext<V>)
      : undefined,
    recognize: config.recognize,
    pastePriority: config.pastePriority ?? 0,
    merge: (current, incoming) =>
      config.merge
        ? config.merge(current as V, incoming as V)
        : Array.isArray(current) && Array.isArray(incoming)
          ? [...new Set([...current, ...incoming])]
          : incoming,
  };
}
interface SelectConfig<T, V> extends FieldConfig<V> {
  renderOption?: (item: T, context: { selected: boolean; choice: Choice }) => ReactNode;
  options: readonly T[] | ExternalOptions<T> | RemoteOptions<T, unknown>;
  getValue?: (item: T) => string;
  getLabel?: (item: T) => string;
  searchable?: boolean;
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
}
function optionRenderer<T>(config: SelectConfig<T, unknown>): RuntimeField["renderOption"] {
  return config.renderOption
    ? (choice, context) => config.renderOption!(choice.data as T, { ...context, choice })
    : undefined;
}
// Remote parameters are captured by the source; consumers never invoke a source with arbitrary params.
export type OptionSource<T> = readonly T[] | ExternalOptions<T> | RemoteOptions<T, unknown>;
function sourceFor<T>(config: SelectConfig<T, unknown>): RuntimeSource {
  const options = config.options;
  const choice = (item: T): Choice => ({
    value: config.getValue ? config.getValue(item) : (item as { value: string }).value,
    label: config.getLabel ? config.getLabel(item) : (item as { label: string }).label,
    disabled: (item as { disabled?: boolean }).disabled,
    data: item,
  });
  if (Array.isArray(options))
    return {
      kind: "local",
      items: options.map(choice),
      loading: config.loading,
      error: config.error,
      retry: config.retry,
    };
  const source = options as ExternalOptions<T> | RemoteOptions<T, unknown>;
  if (source.kind === "external")
    return {
      ...source,
      items: source.items.map(choice),
      selectedItems: source.selectedItems?.map(choice),
    };
  const remoteChoice = (item: T): Choice => ({
    value: source.getValue(item),
    label: source.getLabel(item),
    data: item,
  });
  return {
    kind: "remote",
    items: [],
    scope: source.scope,
    params: source.params,
    debounceMs: source.debounceMs,
    search: async (query, cursor, signal) => {
      const page = await source.search({ query, cursor, signal, params: source.params });
      return { items: page.items.map(remoteChoice), cursor: page.cursor };
    },
    resolve: async (ids, signal) =>
      (await source.resolve({ ids, signal, params: source.params })).map(remoteChoice),
  };
}
const stringCodec: FilterCodec<string | null> = {
  parse: (raw) => raw,
  serialize: (value) => value ?? "",
};
const stringsCodec = jsonCodec<string[] | null>(
  (value): value is string[] | null =>
    value === null || (Array.isArray(value) && value.every((item) => typeof item === "string")),
);
export type DateRange = { from: string | null; to: string | null };
export type NumberRange = [number | null, number | null];
function validDate(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value)
  );
}
export const filter = {
  text(config: FieldConfig<string | null>): Field<string | null> {
    return makeField(
      "text",
      { normalize: (value) => value?.trim() || null, ...config },
      null,
      stringCodec,
    );
  },
  tokens(config: FieldConfig<string[] | null>): Field<string[] | null> {
    return makeField(
      "tokens",
      {
        normalize: (value) =>
          value?.length
            ? [...new Set(value.flatMap((item) => (item.trim() ? [item.trim()] : [])))]
            : null,
        ...config,
      },
      null,
      stringsCodec,
    );
  },
  select<const T extends { value: string; label: string }>(
    config: SelectConfig<T, T["value"] | null>,
  ): Field<T["value"] | null> {
    const allowed = Array.isArray(config.options)
      ? new Set(config.options.map((item: T) => item.value))
      : null;
    const field = makeField("single", config, null, {
      parse: (raw) => (!allowed || allowed.has(raw) ? raw : null),
      serialize: stringCodec.serialize,
    });
    return {
      ...field,
      source: sourceFor(config as SelectConfig<T, unknown>),
      renderOption: optionRenderer(config as SelectConfig<T, unknown>),
      searchable: config.searchable,
    };
  },
  multiSelect<const T extends { value: string; label: string }>(
    config: SelectConfig<T, T["value"][] | null>,
  ): Field<T["value"][] | null> {
    const allowed = Array.isArray(config.options)
      ? new Set(config.options.map((item: T) => item.value))
      : null;
    return {
      ...makeField("multi", config, null, {
        parse: (raw) => {
          const values = stringsCodec.parse(raw);
          return values && (!allowed || values.every((value) => allowed.has(value)))
            ? values
            : null;
        },
        serialize: stringsCodec.serialize,
      }),
      source: sourceFor(config as SelectConfig<T, unknown>),
      renderOption: optionRenderer(config as SelectConfig<T, unknown>),
      searchable: config.searchable,
    };
  },
  options<T>(config: SelectConfig<T, string[] | null>): Field<string[] | null> {
    return {
      ...makeField("multi", config, null, stringsCodec),
      source: sourceFor(config as SelectConfig<T, unknown>),
      renderOption: optionRenderer(config as SelectConfig<T, unknown>),
      searchable: config.searchable,
    };
  },
  numberRange(config: FieldConfig<NumberRange | null>): Field<NumberRange | null> {
    return makeField(
      "numberRange",
      {
        normalize: (value) => (value?.some((bound) => bound !== null) ? value : null),
        validate: (value) =>
          value && value[0] !== null && value[1] !== null && value[0] > value[1]
            ? "Minimum must not exceed maximum."
            : undefined,
        ...config,
      },
      null,
      jsonCodec(
        (value): value is NumberRange | null =>
          value === null ||
          (Array.isArray(value) &&
            value.length === 2 &&
            value.every(
              (item) => item === null || (typeof item === "number" && Number.isFinite(item)),
            )),
      ),
    );
  },
  dateRange(config: FieldConfig<DateRange | null>): Field<DateRange | null> {
    return makeField(
      "dateRange",
      {
        normalize: (value) => (value?.from || value?.to ? value : null),
        isActive: (value) => Boolean(value?.from || value?.to),
        validate: (value) =>
          value?.from && value.to && value.from > value.to
            ? "Start date must not follow end date."
            : undefined,
        ...config,
      },
      null,
      jsonCodec(
        (value): value is DateRange | null =>
          value === null ||
          (typeof value === "object" &&
            value !== null &&
            "from" in value &&
            "to" in value &&
            validDate(value.from) &&
            validDate(value.to)),
      ),
    );
  },
  custom<V>(
    config: FieldConfig<V> & { codec: FilterCodec<V>; defaultValue: V; clearValue: V },
  ): Field<V> {
    return makeField("custom", config, config.defaultValue, config.codec);
  },
};
export interface BoundField<S> extends RuntimeField {
  read(state: S): unknown;
  write(value: unknown, state: S): Partial<S>;
}
export type BoundDefinitions<S> = Record<string, BoundField<S>>;
export function bindFilters<S>() {
  return {
    field<K extends keyof S>(
      key: K,
      definition: Field<NoInfer<Exclude<S[K], undefined>>>,
      options?: { update(value: S[K], current: S): Partial<S> },
    ): BoundField<S> {
      return {
        ...definition,
        read: (state) => (state[key] === undefined ? definition.defaultValue : state[key]),
        write: (value, state) =>
          options ? options.update(value as S[K], state) : ({ [key]: value } as Partial<S>),
      };
    },
    composite<const K extends readonly (keyof S)[], V>(
      keys: K,
      config: {
        field: Field<V>;
        read(state: Pick<S, K[number]>): V;
        write(value: V, current: Pick<S, K[number]>): Pick<S, K[number]>;
      },
    ): BoundField<S> {
      const pick = (state: S) =>
        Object.fromEntries(keys.map((key) => [key, state[key]])) as Pick<S, K[number]>;
      return {
        ...config.field,
        read: (state) => config.read(pick(state)),
        write: (value, state) => config.write(value as V, pick(state)) as Partial<S>,
      };
    },
  };
}
