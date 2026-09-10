# Mendy UI

My personal collection of components I like to use. Maintained as one package and shared across projects.

```sh
npm install @mendylanda/ui
```

Import the stylesheet once:

```tsx
import "@mendylanda/ui/styles.css";
```

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

`FilterBar` and composed `FilterList` include Clear all after the chips. It clears filters and search. Set `showClear={false}` to opt out. Choice search is enabled by default; use `searchable: false` for short lists. Menu selections keep the menu open, and selecting the current single choice again clears it. Chip editor popups open instantly; `editorAnimation` opts into their animation.

See [defaults and app configuration](https://ui.mendylanda.com/docs/defaults) for the full behavior and [system reference](https://ui.mendylanda.com/docs/system) for query adapters, selected-label loading, grouped fields, and custom editors.
