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
