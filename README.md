# Mendy UI

My personal collection of components I like to use. Built with React and shadcn/ui. MIT licensed.

[Documentation and demos](https://ui.mendylanda.com) · [Filters](https://ui.mendylanda.com/docs/components/filters)

```sh
npx shadcn@latest add https://ui.mendylanda.com/r/filter-system.json
```

Filters includes typed definitions, URL and session persistence, remote options, paste recognition, suggestions, and custom editors. Use the built-in state hooks or bind the UI to your existing state and queries. Controls use shadcn components and theme radius. Recognized IDs can become editable chips directly from search, without menu entries. Date filters use a calendar for a day or range. Your app filters its data. The demos use React 19, Tailwind CSS 4, and Radix-based shadcn.

## Development

Requires Node.js 22 and pnpm 10.28.2.

```sh
pnpm install
pnpm dev
```

Source lives in `registry/new-york`. Both the live demos and generated registry use these files. Add new registry items in `registry.json`, examples in `examples`, and MDX documentation in `content/docs`.

```sh
pnpm lint
pnpm format
pnpm build
pnpm typecheck
pnpm exec playwright install chromium
pnpm test:unit
pnpm test
pnpm verify:consumers https://ui.mendylanda.com --demo
```

`pnpm build` generates registry JSON in `public/r` and a static site in `out`. The docs setup is adapted from startercn and uses Fumadocs MDX and Shiki. No server or database is needed at runtime.

The consumer check creates fresh Next.js and Vite apps in your temporary directory, installs through the shadcn CLI, and builds them. Pass a local preview origin to test unpublished filter changes; `--demo` also checks the complete filter system and demo. Dependencies from this registry resolve against the supplied preview origin.

## Deployment

`pnpm deploy` builds and deploys to Cloudflare Workers Static Assets. The custom domain is configured in `wrangler.jsonc`. Use environment variables for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

GitHub Actions checks the site and deploys successful main builds using repository secrets with those names. Pull requests run checks without deployment. Keep credentials out of source control; use a token scoped to this project's deployment requirements.

## Updating installed components

Registry installation copies files into the consumer's app. Later changes here do not automatically update them. Review the [changelog](CHANGELOG.md), commit local modifications, and inspect installation diffs before accepting updates.

## Attribution

See [NOTICE.md](NOTICE.md), [LICENSE](LICENSE), and [third-party licenses](THIRD_PARTY_LICENSES).
