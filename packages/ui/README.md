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

Use `chipLabel: false` when the selected values explain themselves. A string such as `chipLabel: "SIM"` shortens the visible label while retaining the field's full accessible name. `renderSummary` supplies custom chip content independently of `renderOption`.

`FilterMenuGroup.separatorBefore` separates related categories. Within a group, `menuLayout: "inline"` puts a field's editor beside its label. Custom editors can set `editorPadding: "none"` when they own their spacing. Honor the `autoFocus` value supplied to `renderEditor`: it is false during menu previews, and the menu moves focus on click or keyboard activation.

`<MendyUIProvider menuLayout="anchored">` positions desktop editors beside the selected row at their own height. The default remains `connected`. Both use the single-panel mobile layout. A standalone `<FilterMenu anchor={searchRef}>` can align to a custom search field. The menu grows to the available viewport height, capped by `--mendy-filter-menu-max-height`, which defaults to `44rem`; large lists remain virtualized.

Chips enter with a short, staggered Motion spring. Reduced-motion preferences disable their movement. Theme radius still controls their corners.
