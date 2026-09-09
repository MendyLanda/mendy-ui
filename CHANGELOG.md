# Changelog

## Unreleased: menu interaction polish

- Start empty text editors without an error; show validation on invalid edits or an attempted save, and associate keyboard instructions with the input.

- Use 32px filter and option rows on fine-pointer desktops, with the existing touch spacing.
- Keep drafts and option searches while browsing an open menu. Closing discards unapplied drafts; clearing one filter preserves the others' drafts.
- Keep hover and keyboard focus on the same filter. Protect focused text inputs from hover changes and allow diagonal movement into the editor.
- Fix Tab entry and dismissal, focus checked options on entry, isolate list typeahead, and announce applied filters.
- Preserve the trigger's text direction in the portalled menu and reverse entry/return arrows for RTL layouts.

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

### Design and stress testing

- Contain long option names and chips, narrow search containers, and independently scrolling filter lists. Scale menu proportions with root text size and mirror search controls in RTL.
- Center calendars, distinguish today from selection, remove duplicate date-clear controls, and refine text labels, search density, and chip value contrast.
- Virtualize collections above 100 rows with measured wrapping, full-list keyboard navigation, and focus preservation during scrolling and data replacement. Add filter-type search above 20 entries. Avoid mounting inactive chips and remove quadratic work from selection summaries.
- Run interaction and accessibility checks in Chromium, Firefox, and WebKit, including phone layouts. Keep clipboard test data intact in Firefox and create stress report directories on clean CI checkouts.
- Add production-package stress checks for 1,000 filters, 50,000 options, 10,000 selected values, long labels, async races, and repeated opening/closing. Run with `pnpm test:stress`.
