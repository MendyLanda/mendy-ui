# Mendy UI

React components by Mendy Landa. My collection currently includes Table and Filters, maintained in one package and shared across projects.

Use either component independently or connect them. [Documentation and live examples](https://ui.mendylanda.com).

```sh
npm install @mendylanda/ui
```

Import the stylesheet once:

```tsx
import "@mendylanda/ui/styles.css";
```

## Table

The table is exported from `@mendylanda/ui/table`.

```tsx
import { DataTable, defineColumns, format } from "@mendylanda/ui/table";

type Project = { id: string; name: string; budget: number };
const columns = defineColumns<Project>((column) => [
  column.accessor("name", { label: "Project" }),
  column.accessor("budget", { label: "Budget", format: format.currency("USD") }),
]);

export function Projects({ rows }: { rows: Project[] }) {
  return <DataTable rows={rows} columns={columns} getRowId={(row) => row.id} />;
}
```

Use `useDataTable` and `TableView` when the application already controls sorting, pagination, preferences, or selection. Data fetching and mutations stay in the application. `useResultSelection` represents explicit IDs or all matching results with exclusions. `TableSavedViews` accepts application-owned views; it does not create a backend.

Pass a filter controller once to place the shared filter bar and connect table recovery behavior:

```tsx
<DataTable
  table={table}
  filters={filters}
  toolbar={<ProjectActions />}
  filterBar={{ showSearch: false }}
/>
```

Create the controller with `useFilters`, `useUrlFilters`, or `useControlledFilters`. Its values remain application query state. The table does not derive a predicate or fetch rows from filter definitions. Set `filterBar={false}` when controls live elsewhere, or use `TableFilters` and `TableView` with the same controller in a composed layout.

Tables use `layout="content"` by default, fitting their rows, headers, and empty content up to 65dvh. Short tables do not reserve a vertical scrollbar. An explicit `height` sets the table viewport in content layout. `layout="fill"` measures the space from the component's top to the bottom of the viewport and remeasures when the viewport resizes or content above the table changes size. `DataTable` reserves its toolbar, pagination, and footer automatically. Composed layouts can pass controls below the grid through `TableView`'s `footer` prop. Rows remain 44px unless `rowHeight="auto"` opts into measurement for wrapped or editable content. Selected rows receive the standard highlight; `isRowHighlighted` adds application state. `onRowClick`, `rowClassName`, and `renderRowDetail` cover row actions and expandable content.

Changes to table query state or the shared controller reset scroll and cell selection. Appending rows keeps the current position and selection. Empty states distinguish an empty dataset, an empty filtered result with one controller clear, and an empty later page that can return to the first page. Locked filters never get a clear action.

See the [table documentation](https://ui.mendylanda.com/docs/components/table) for composition, remote data, and persistence.

## Filters

Define filters in your application:

```tsx
"use client";
import { defineFilters, filter, FilterBar, useFilters } from "@mendylanda/ui/filters";

const definitions = defineFilters({
  status: filter.select({
    label: "Status",
    searchable: false,
    options: [
      { value: "open", label: "Open" },
      { value: "closed", label: "Closed" },
    ],
  }),
});

export function IssueFilters() {
  const filters = useFilters(definitions);
  return <FilterBar filters={filters} />;
}
```

Use `filters.values` and `filters.search` in your data queries. Menus, editable chips, keyboard interactions, focus, dynamic options, paste recognition, and predefined shortcuts come from the package.

React 19 is required. Tailwind and local shadcn files are not required. Compiled CSS is scoped to Mendy UI elements and follows your shadcn theme variables and radius. It inherits your font and does not reset unrelated application elements.

For URL persistence, install `nuqs`, configure its router adapter, and import `useUrlFilters` from `@mendylanda/ui/filters/nuqs`. Applications with existing state can use `bindFilters` and `useControlledFilters` instead.

Customize with named `classNames`, typed option/editor/summary renderers, `MendyUIProvider` control replacements, or composed layouts. The provider can also keep portals inside a local theme or dialog.

- [Documentation](https://ui.mendylanda.com/docs)
- [Customization](https://ui.mendylanda.com/docs/customization)
- [Source and releases](https://github.com/MendyLanda/mendy-ui)

Update the dependency and redeploy a project to receive shared fixes. MIT licensed. Shadcn attribution is included in the package.

### Chip and menu presentation

Choice fields omit redundant chip labels by default. Set `chipLabel: true` to show the field name. Text, tokens, dates, ranges, and custom fields keep their labels by default. A string such as `chipLabel: "ID"` shortens the visible label while retaining the field's full accessible name. `renderSummary` supplies custom chip content independently of `renderOption`.

`FilterMenuGroup.separatorBefore` separates related categories. Within a group, `menuLayout: "inline"` puts a field's editor beside its label. Custom editors can set `editorPadding: "none"` when they own their spacing. Honor the `autoFocus` value supplied to `renderEditor`: it is false during menu previews, and the menu moves focus on click or keyboard activation.

Desktop editors sit beside the selected row at their own height by default. Set `<MendyUIProvider menuLayout="connected">` to use a full-height attached editor. Both use the single-panel mobile layout. A standalone `<FilterMenu anchor={searchRef}>` can align to a custom search field. The menu grows to the available viewport height, capped by `--mendy-filter-menu-max-height`, which defaults to `44rem`; large lists remain virtualized.

Chips enter with a short, staggered Motion spring. Reduced-motion preferences disable their movement. Theme radius still controls their corners.

Filter lists use the search anchor's width by default and shrink when the viewport cannot fit both columns. Override `--mendy-filter-list-width` or `--mendy-filter-menu-width` for a custom layout. In anchored mode, editors touch the list and move upward for lower rows so short editors stay within the list's height.

`FilterList` uses Motion variants with a 60ms stagger on initial list entry and the default item transition from y=10/opacity=0 to y=0/opacity=1. New chips enter immediately, without a delay based on their list position. `FilterChipList` provides the same orchestration for custom compositions of `FilterChip`; standalone chips also animate.

### Existing search state

`useFilterSearch(value, onChange, delay?)` keeps a responsive input draft while debouncing writes to an existing URL or query hook. It ignores acknowledgements of earlier writes while the user is typing, accepts external navigation, clears immediately, and cancels pending writes on unmount. The default delay is 300ms.

```tsx
const search = useFilterSearch(params.search, (value) => setParams({ search: value }));
return <input value={search.value} onChange={(event) => search.setValue(event.target.value)} />;
```

### Tailwind 3

Import `@mendylanda/ui/styles.tailwind3.css` instead of `@mendylanda/ui/styles.css` in Tailwind 3 projects. It contains the same scoped rules with compatible CSS layers. No package-specific PostCSS plugin is needed. Tailwind 4 projects and projects without Tailwind should use `styles.css`.

The package expects complete CSS color values. A host that stores HSL channels still needs to map them to colors, including inside portals and any custom editors that use host styles.

Opening the menu shows the category list without choosing a filter. Focusing a category does not open it. Hover previews its editor; click, Enter, Space or the entry arrow opens it and moves focus into the editor.

### Defaults and clearing

`FilterBar` and composed `FilterList` show Clear all after the chips when a removable filter is active. It clears filters and search. Search-only bars use the input’s clear control and hide the filter menu when no menu fields are available. Set `showClear={false}` to opt out. Choice search is enabled by default; use `searchable: false` for short lists. Menu selections keep the menu open, and selecting the current single choice again clears it. Chip editor popups open instantly; `editorAnimation` opts into their animation.

See [defaults and app configuration](https://ui.mendylanda.com/docs/defaults) for the full behavior and [system reference](https://ui.mendylanda.com/docs/system) for query adapters, selected-label loading, grouped fields, and custom editors.

## Localization

English is the default for Table and Filters. Set Hebrew once for built-in text, calendar labels, accessible announcements, and RTL behavior:

```tsx
import { MendyUIProvider } from "@mendylanda/ui";
import { he } from "@mendylanda/ui/locales/he";

<MendyUIProvider locale={he}>
  <YourTablesAndFilters />
</MendyUIProvider>;
```

Use `messages` for individual wording overrides, or `defineLocale` to create a private dictionary with English fallbacks. Complete contributed dictionaries use the `MendyMessages` type. Application labels and values remain application-owned; locale changes preserve IDs and saved state. See [Localization](https://ui.mendylanda.com/docs/localization) for the live English/Hebrew example, Next.js usage, and formatting.
