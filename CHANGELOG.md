# Changelog

## [0.4.1](https://github.com/MendyLanda/mendy-ui/compare/v0.4.0...v0.4.1) (2026-09-15)


### Fixes

* **filters:** round exposed editor corners at panel joins ([9f3005e](https://github.com/MendyLanda/mendy-ui/commit/9f3005e21c7918e7b199b6257de6add79fb08234))
* **release:** skip dev snapshots for stable release commits ([619e145](https://github.com/MendyLanda/mendy-ui/commit/619e1451770c36dcc629ed48b5539001a9dc57e4))
* resolve table and URL filter integration issues ([603fbe5](https://github.com/MendyLanda/mendy-ui/commit/603fbe5cc95f781186d8ff51a1277289733685a7))

## [0.4.0](https://github.com/MendyLanda/mendy-ui/compare/v0.3.1...v0.4.0) (2026-09-15)


### Features

* **i18n:** add English and Hebrew locales for tables and filters ([4108694](https://github.com/MendyLanda/mendy-ui/commit/4108694e944d935beb59c3b3b8b115208d457b24))
* **table:** improve embedded layouts and toolbar composition ([5c9d732](https://github.com/MendyLanda/mendy-ui/commit/5c9d7326a659ddf314ec14c905266fc404ee130a))


### Fixes

* **i18n:** preserve locale on standalone table controls ([0ef9785](https://github.com/MendyLanda/mendy-ui/commit/0ef9785a4046cf8030396c3278c4231b866fcef4))


### Automation

* **release:** automate dev publishing and stable release PRs ([61beaa7](https://github.com/MendyLanda/mendy-ui/commit/61beaa7661069a0307a0d7ad0b48f742e5fbe9c6))
* **release:** cancel superseded release branch checks ([6b71962](https://github.com/MendyLanda/mendy-ui/commit/6b71962091a7df3c817266cbf25889cf243bcbec))
* **release:** preserve generated changelog formatting ([022737c](https://github.com/MendyLanda/mendy-ui/commit/022737ce8590a275ff924dc9cd06ad939fdb9089))
* **release:** report PR status directly from dispatched checks ([581b055](https://github.com/MendyLanda/mendy-ui/commit/581b055ea0a9ffef4ccf37d292ed5d74fbe8961c))
* **release:** separate release status reporting from PR creation ([2934a25](https://github.com/MendyLanda/mendy-ui/commit/2934a2548699badaaea5fe045667fc077676f863))
* **release:** show dispatched checks on release pull requests ([a45b0ab](https://github.com/MendyLanda/mendy-ui/commit/a45b0abbcc571b1a6adbaaffc196f248b6880558))

## 0.3.1

- Give table loading, empty, error, and incremental-loading feedback valid grid row and cell semantics, with matching accessible row counts.
- Reorganize the documentation around Table and Filters, with a real package table on the homepage and dedicated table guides.

## 0.3.0

- Release Table in the stable package with typed columns, virtualization, selection, clipboard support, preferences, and incremental loading.
- Add content and viewport-fill layouts, shared filter integration, growing columns, and inline row-selection controls.

## 0.3.0-alpha.8

- Fit short tables and custom empty states to their natural height without unnecessary vertical scrolling. Keep the viewport cap and fixed-height overrides.
- Hide the filter menu when no menu fields are available. Search-only bars use the input clear action without a redundant Clear all.

## 0.3.0-alpha.7

Prerelease under the `alpha` tag.

- Connect an existing filter controller to `DataTable` and `TableView`. `DataTable` can place `TableFilters` beside toolbar actions, hide free-text search, or leave filter rendering to the application.
- Keep filtering and data fetching in application-owned state. Empty results can clear the shared controller once, retain locked filters, or return an empty later page to page one.
- Default table height to its measured content with a 65dvh cap. Keep 44px rows by default and add measured automatic row height for wrapped, editable, and expanded content.
- Reset scroll and cell selection when sorting, filters, pagination, controller values, or an explicit query key changes. Preserve both when rows are appended.
- Highlight selected rows automatically. Add single-click row actions, application row classes, measured row details, and additive custom highlights.
- Accept readonly row arrays and keep nested grids, disclosure controls, and application inputs isolated from parent table keyboard and pointer handling.

## 0.3.0-alpha.6

- Restore the spinner beside the incremental-loading status, with reduced-motion support.
- Keep copied cells green while their row is hovered or highlighted, then restore the row highlight after the copy feedback ends.

## 0.3.0-alpha.5

- Keep keyboard copying available after the focused row scrolls out of view and remounts. Preserve focus on controls outside the table.
- Hide selection strokes behind pinned columns and avoid a second focus outline inside selected ranges. Keep end-pinned columns fully visible across virtual column gaps.
- Copy only the selected cells, preserving custom values, pinned order, exclusions, and disabled cells without allocating unrelated columns.
- Reuse unchanged rows and column geometry, cache class-name merges, and avoid unnecessary layout reads during scrolling and incremental loading.

## 0.3.0-alpha.4

- Virtualize columns as well as rows, retaining pinned columns and keyboard focus. Construct viewport cell objects on demand.
- Reuse cell content during viewport resizing and scrolling, and preserve row models when consumers recreate equivalent array shells. Changed records and callbacks still update.
- Copy selections without scanning unrelated rows. Reuse virtual row measurements and serialize preferences only when their values change.
- Add browser regression budgets for 100,000 rows, 100 columns, and ten-million-cell selections.

## 0.3.0-alpha.3

- Grow data columns into available viewport space, with weighted `grow` controls and `maxSize` caps. Preserve manual widths and resize from the displayed width.
- Draw continuous selection outlines over cell borders, including fractional-pixel row positions.
- Resume incremental loading after returning to a cancelled query and ignore stale virtual ranges during scroll resets.

## 0.3.0-alpha.2

- Keep the last header border aligned with the column cells on wide screens.
- Use text-color hover feedback for sortable headers, with no button background.
- Replace nested column menus with a compact settings panel: drag or keyboard reorder, visibility checkboxes, cycling pin controls, a summary, and Reset.

## 0.3.0-alpha.1

- Render loading skeletons in the same column layout as loaded rows, with one header and scroll area.
- Keep cell focus when a column menu finishes closing after a cell was selected.
- Restore prominent pinned-column boundaries in headers, loading rows, and loaded rows.
- Keep pin boundaries disabled when a narrow viewport temporarily unpins columns.

## 0.3.0-alpha.0

First table prerelease, published under `alpha`; `latest` remains 0.2.0.

- Add typed column definitions and reusable number, currency, and date formats.
- Add a virtualized table with sticky headers, resizing, pinning, column settings, sorting, keyboard cell selection, and clipboard copy.
- Support independently controlled filtering, sorting, and pagination, plus incremental loading and retry states.
- Add scoped, versioned column preferences, saved-view controls, explicit/all-matching selection, and loaded-row CSV export.
- Export `DataTable`, `useDataTable`, and composable table controls through `@mendylanda/ui/table`.
- Document the alpha API and add a 10,000-row demo. Existing filter defaults are unchanged.

## 0.2.0

This update changes presentation defaults. Existing projects can retain the previous layout with `menuLayout="connected"` and visible choice names with `chipLabel: true`.

- Default to row-aligned desktop editors at their own height. Keep the single-panel mobile layout.
- Omit redundant field names from choice chips by default, preserving accessible labels and explicit overrides.
- Keep standalone single-select editors open by default and allow toggling the selected value off. Use `closeOnSelect` or `removable={false}` to override this behavior.
- Add compact toggle buttons for built-in single-choice fields with `menuLayout: "inline"` in a grouped menu.
- Document defaults, typed state, dynamic label resolution, composition, and Tailwind 3 integration. Update examples to use the standard behavior and generic project data.

## 0.1.9

- Include Clear all at the end of `FilterList` by default, including composed layouts. Add `showClear` to `FilterList` and `FilterBar` for opting out.

## 0.1.8

- Open chip editor popups instantly by default; add an animation opt-in.
- Remove synthetic Any options. Selecting a current single choice clears it unless the field is non-removable.
- Let clicks through empty space around row-aligned editors dismiss the menu and reach the page on the first click.

## 0.1.7

- Keep selected-label skeletons visible during pending resolution, including custom summaries. Retain known labels during refetches.
- Use consistent widths for chip and menu editors and fix focus handoff when switching directly between chips.

## 0.1.6

- Add scoped Tailwind 3 compatibility styles and remove unnecessary package dependencies.
- Add `useFilterSearch` for responsive drafts backed by existing query-state hooks.

## 0.1.5

- Restore balanced spacing around category dividers and reduce the option search row height.

## 0.1.4

- Center rows adjacent to category dividers.

## 0.1.3

- Match category-list width to the search anchor and position lower editors upward within the list.
- Restore staggered chip entrances and keep newly inserted chips immediate.
- Integrate option search into panels, add search opt-outs, use checkmarks for selection, and stabilize editor placement while searching.

## 0.1.2

- Add optional row-aligned desktop editors, grouped sections, chip-label overrides, and custom option rendering.
- Improve preview focus, menu alignment, compact controls, and handling of long lists and content.

## 0.1.1

- Disable server-rendered controls until hydration can handle edits.
- Improve viewport placement, draft retention, keyboard navigation, focus restoration, and RTL behavior.
- Use compact desktop rows and larger touch targets.
- Virtualize large collections with measured wrapping and preserve selected values outside the visible rows.
- Add interaction, accessibility, and performance checks for large lists, long labels, asynchronous requests, and narrow screens.

## 0.1.0

- Distribute one shared React npm package with ESM, TypeScript declarations, bundled shadcn controls, and scoped CSS.
- Include typed definitions, local and controlled state, optional nuqs/session persistence, dynamic options, recognition, suggestions, composite bindings, custom editors, and summary policies.
- Add configurable immediate application, theme radius, reduced-motion support, and examples using issues, projects, and people.

Earlier source-copy registry experiments were superseded by the npm package.
