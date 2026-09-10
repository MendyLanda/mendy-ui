# Changelog

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
