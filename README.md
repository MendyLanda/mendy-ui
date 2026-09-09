# Mendy UI

My personal collection of components I like to use. One React package, maintained here and shared across projects. Built with shadcn controls and Tailwind. MIT licensed.

[Documentation and demos](https://ui.mendylanda.com)

```sh
npm install @mendylanda/ui
```

```tsx
import "@mendylanda/ui/styles.css";
import { defineFilters, filter, FilterBar, useFilters } from "@mendylanda/ui/filters";
```

Filters includes typed definitions, local and controlled state, dynamic options, paste recognition, predefined shortcuts, custom editors, and URL persistence through an optional nuqs adapter. The package supplies compiled, scoped CSS. Applications can use it without Tailwind or local copies of shadcn controls.

Your app owns definitions, data queries, and business rules. Shared interaction behavior stays in the package. Customize it through theme variables, named classes, typed render callbacks, control replacements, or composition. See the [customization guide](https://ui.mendylanda.com/docs/customization).

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

`pnpm build` builds the package and the static documentation site. `pnpm verify:consumers` packs the package and installs that tarball in fresh Vite and Next.js apps. It checks Vite without nuqs or Tailwind, Next.js with the URL adapter, exported types against the SimCall schema fixture, and browser interactions with customization. Fixtures and screenshots remain in the reported temporary directory.

## Package distribution

The package exports ESM JavaScript and TypeScript declarations. React 19 is a peer dependency. Nuqs is an optional peer used only by `@mendylanda/ui/filters/nuqs`. Pure helpers are available from `@mendylanda/ui/filters/core`; default controls are available from `@mendylanda/ui/primitives` and individual control paths.

Run `pnpm package:pack` to create an installable archive in `artifacts/`. Read [RELEASING.md](RELEASING.md) before publishing a version. The source-copy registry is retired; existing copied installations keep working, but move to the package to receive future fixes through dependency updates.

## Website deployment

GitHub Actions checks the package, packed consumers, and site. Successful main builds deploy to Cloudflare Workers Static Assets using the existing repository secrets. Publishing an npm version is a separate release operation.

The site must not advertise an unavailable release. Publish the initial package before merging the npm migration into main.

## Attribution

See [NOTICE.md](NOTICE.md), [LICENSE](LICENSE), and [third-party licenses](THIRD_PARTY_LICENSES).
