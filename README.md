# Mendy UI

React components by Mendy Landa. My collection currently includes **Table** and **Filters**, maintained in one package and used across projects. MIT licensed.

[Documentation and live examples](https://ui.mendylanda.com)

```sh
npm install @mendylanda/ui
```

```tsx
import "@mendylanda/ui/styles.css";
```

## Components

| Component                                                    | Import                   | What it does                                                                                                  |
| ------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| [Table](https://ui.mendylanda.com/docs/components/table)     | `@mendylanda/ui/table`   | Typed columns, virtual scrolling, sorting, resizing, pinning, selection, copying, and persistent preferences. |
| [Filters](https://ui.mendylanda.com/docs/components/filters) | `@mendylanda/ui/filters` | Typed definitions, search, menus, editable chips, dynamic options, recognition, and optional URL persistence. |

Use either component independently or pass a filter controller to `DataTable` to connect them. Your application owns queries, permissions, and data matching. The package owns shared interaction behavior.

React 19 is required. Compiled, scoped CSS is included; Tailwind and nuqs are optional. Both components use your application's semantic colors, font, and radius. See [installation](https://ui.mendylanda.com/docs/installation), [styling](https://ui.mendylanda.com/docs/customization), and [keyboard behavior](https://ui.mendylanda.com/docs/accessibility).

## Development

Requires Node.js 22 and pnpm 10.28.2.

```sh
pnpm install
pnpm dev
```

The implementation lives in `packages/ui/src`. The website and examples import the built package through a workspace dependency. After changing package source during development, run `pnpm package:build` to rebuild it. `pnpm dev` builds the package before starting Next.js.

```sh
pnpm lint
pnpm format
pnpm build
pnpm typecheck
pnpm exec playwright install chromium
pnpm test:unit
pnpm test
pnpm verify:consumers
```

`pnpm build` builds the package and the static documentation site. `pnpm verify:consumers` packs the package and installs that tarball in fresh Vite and Next.js apps. It checks Vite without nuqs or Tailwind, Next.js with the URL adapter, exported types against a synthetic project schema fixture, and browser interactions with customization. Fixtures and screenshots remain in the reported temporary directory.

## Package distribution

The package exports ESM JavaScript and TypeScript declarations. React 19 is a peer dependency. Nuqs is an optional peer used only by `@mendylanda/ui/filters/nuqs`. Pure helpers are available from `@mendylanda/ui/filters/core`; default controls are available from `@mendylanda/ui/primitives` and individual control paths.

Run `pnpm package:pack` to create an installable archive in `artifacts/`. Read [RELEASING.md](RELEASING.md) before publishing a version. The source-copy registry is retired; existing copied installations keep working, but move to the package to receive future fixes through dependency updates.

## Website deployment

GitHub Actions checks the package, packed consumers, and site. Successful main builds deploy to Cloudflare Workers Static Assets using the existing repository secrets. Publishing an npm version is a separate release operation.

Publish a package release before deploying documentation for APIs introduced by that release.

## Attribution

See [NOTICE.md](NOTICE.md), [LICENSE](LICENSE), and [third-party licenses](THIRD_PARTY_LICENSES).
