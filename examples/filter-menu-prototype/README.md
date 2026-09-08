# Connected filter menu experiment

Question: can the filter list and editor share one container while staying compact on a phone?

This is throwaway UI code on `prototype/connected-filters`. No layout has been chosen. The published registry and `main` keep the current menu.

Run `pnpm dev --port 3100` from this worktree, then open:

- `http://localhost:3100/?variant=joined`: adjacent columns on desktop; list/editor with Back below 640px.
- `http://localhost:3100/?variant=inline`: one expanded editor inside the filter list.
- `http://localhost:3100/?variant=compact`: one panel, with Back to return to the filter list.

The bottom switcher changes variants. Left and right arrow keys switch variants when focus is outside a control or an open menu. Values live in memory and survive variant changes, but reset on reload. Open “Filter values” below the table to inspect them. The Created filter uses September 1–8, 2026 for the sample issues.

The prototype reuses the real table, controller, recognition, presets, chips, and editors. This branch adds a temporary menu slot, editor exports, and control over autofocus to the registry source. These are evaluation hooks, not a proposed public API. Do not publish the registry built from this branch.

The switcher and experimental demo appear in development. A normal production build renders the existing demo. For a static review preview, explicitly build with `NEXT_PUBLIC_FILTER_PROTOTYPE=1 pnpm build`, then serve with `PORT=3100 node scripts/serve-test-build.mjs`. This opt-in is only for the prototype preview. When a layout is chosen, implement it in the real registry with its API, accessibility checks, and consumer installation verification. Keep this branch as the comparison reference.
