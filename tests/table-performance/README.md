# Table performance checks

This production-built fixture deliberately recreates column definitions, callbacks,
and the rows array on parent renders. Records change immutably. It uses generic
generated data and does not contact an application API.

Build the package and start the fixture:

```sh
pnpm package:build
node tests/table-performance/serve.mjs
```

In another terminal:

```sh
ASSERT_BUDGET=1 node tests/table-performance/check.mjs /tmp/table-performance.json
BENCH_COLUMNS=1000 ASSERT_BUDGET=1 node tests/table-performance/check.mjs /tmp/table-performance-wide.json
```

The runner measures 10,000 and 100,000 rows, mounted cells, renderer calls, parent
updates, window resizing, scrolling, and 120 frames of combined scrolling and
container resizing. Millisecond measurements include browser automation and frame
waits; compare them on the same machine without other heavy workloads. Frame
intervals are headless Chromium measurements, not guarantees for every device.

`tests/table-performance.spec.ts` runs in the normal browser suite. Its deterministic
budgets check fewer than 600 mounted cells, zero repeated content renders when
shrinking the viewport, reuse of equal row-array shells, fresh immutable updates,
keyboard traversal through unmounted columns, custom input focus, bounded cell
allocation, selection of ten million cells, and copying without scanning unrelated
rows. These tests should fail if an optimization silently freezes application data.
