# Filter stress checks

`pnpm test:stress` builds the package and a production Vite fixture, then runs the behavior checks in Chromium. It uses port 8790. The fixture imports the package exports and compiled CSS, without host Tailwind. All data is synthetic.

`pnpm test:stress -- --measure` also captures layout states and measures menu opening and option search. If invoking the runner directly, use `node tests/stress/run.mjs --measure` after building the package. Reports and screenshots go to `artifacts/ui-polish/design-stress/`.

The measured cases use 1,000 filters, 10,000 options, and both together. Each runs three times with Chromium's 4× CPU slowdown. Times include Playwright action dispatch and two animation frames after the update. They are comparative local measurements, not production INP or hardware-independent budgets. Run them without concurrent builds or browser suites.

Behavior checks cover 50,000 searchable options, 10,000 selected values, 1,000 filter definitions, long unbroken labels, a 260px host container, keyboard access beyond the first batch, stale remote responses, retry, pagination, and 30 open/close cycles. Heap checks force GC and permit 8 MiB of retained growth for framework caches; this does not prove absence of every leak.

The initial render shows up to 100 rows. Search reaches the complete data set and Show more reveals another 100. Filter types gain search above 20 entries. Explicitly revealing the full collection can still create a large DOM; remote sources should paginate their responses.
