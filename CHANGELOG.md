# Changelog

## 0.1.0 — npm package

- Distribute one shared `@mendylanda/ui` package instead of copying source through the registry.
- Include ESM builds, TypeScript declarations, shadcn controls, and scoped compiled CSS. Keep nuqs optional.
- Add named styling points, typed option renderers, control replacements, configurable portals, and composed field editors.
- Build the website against package exports and verify the packed archive in Vite and Next.js.

## Connected filter menu

- The filter list and editor share one container on desktop. Hover reveals options; click or keyboard entry focuses the editor.
- On mobile, the editor replaces the list and offers Back. Menus open and change immediately without animation.
- Grouped fields, remote options, custom editors, URL persistence, and immediate selections use the same behavior. Clear removes a panel's applied values without closing it.
- Filter definitions and groups accept an optional `icon`.

## Predefined shortcuts

- Clicking a predefined filter applies it without opening the editor. A second click edits the applied chip. Suggestions without preset values still open an editor.

## Immediate selection and appearance preview

- Dates and number ranges apply each valid change immediately; date chip editors stay open for range selection.
- Text editors save with Enter by default. Explicit buttons remain available through `FilterTextEditor commitMode="apply"` or custom editors.
- The site's Appearance menu previews square, small, default, or rounded corners.
- Removed the Done button from the member example.

## Theme controls and recognized input

- Chips and controls follow the theme radius. Checkboxes, buttons, inputs, and calendars use shadcn.
- Date ranges use a calendar with single-day selection and an explicit Apply action.
- `menu: false` hides an entry while keeping recognition and chip editing. Enter recognizes typed input, just like paste.
- Public examples use issue IDs, email addresses, projects, and teams. The existing-state example is now `project-filters-demo`.

## Unreleased

- Keep the filter menu open after applying by default; add `closeMenuOnApply` on the bar and individual fields.
- Keep unapplied suggestions visible when another filter is applied. Removing a suggested filter restores its shortcut.

- Add the complete filter system: typed definitions, controlled and local state, nuqs/session persistence, dynamic options, paste recognition, suggested filters, composite bindings, custom editors, and summary policies.
- Make the full system the default installation. Existing `filters` primitives remain available.
- Add dynamic-data and SimCall-style controlled examples.

- Restore arrow submenus that apply values before creating chips.
- Restore the chip entry animation and respect reduced motion.

- Add SimCall's search field and embedded filter button to the table demo.
- Match the selection editor's search row to SimCall's dropdown.

- Restore the flat filter chips and compact styling used in SimCall.
- Use Geist and the original theme colors in the demos.
- Simplify the site and describe it as a personal component collection.

## 0.1.0

- Initial public filters registry and interactive documentation.
- Independent edit and remove controls, including editable required filters.
- Text drafts with validation, single selection, and searchable multiple selection.
- A complete issue-table example and custom-editor recipe.
- Cloudflare static hosting at ui.mendylanda.com.
