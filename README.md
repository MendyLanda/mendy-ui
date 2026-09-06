# Mendy UI

Composable React components by Mendy Landa. Built on shadcn/ui, distributed as source, and MIT licensed.

[Documentation and demos](https://ui.mendylanda.com) · [Filters](https://ui.mendylanda.com/docs/components/filters)

```sh
npx shadcn@latest add https://ui.mendylanda.com/r/filters.json
```

Launch scope: editable filter chips, text drafts, single selection, searchable multiple selection, and custom editors. The consuming app owns filter values, query logic, and persistence. React 19, Tailwind CSS 4, and Radix-based shadcn are the initial compatibility targets.

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
pnpm test
pnpm verify:consumers https://ui.mendylanda.com --demo
```

`pnpm build` generates registry JSON in `public/r` and a static site in `out`. The docs setup is adapted from startercn and uses Fumadocs MDX and Shiki. No server or database is needed at runtime.

The consumer check creates fresh Next.js and Vite apps in your temporary directory, installs through the shadcn CLI, and builds them. Pass a local preview origin to test unpublished filter changes; `--demo` also checks the demo block and its public registry dependency.

## Deployment

`pnpm deploy` builds and deploys to Cloudflare Workers Static Assets. The custom domain is configured in `wrangler.jsonc`. Use environment variables for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.

GitHub Actions checks the site and deploys successful main builds using repository secrets with those names. Pull requests run checks without deployment. Keep credentials out of source control; use a token scoped to this project's deployment requirements.

## Updating installed components

Registry installation copies files into the consumer's app. Later changes here do not automatically update them. Review the [changelog](CHANGELOG.md), commit local modifications, and inspect installation diffs before accepting updates.

## Attribution

See [NOTICE.md](NOTICE.md), [LICENSE](LICENSE), and [third-party licenses](THIRD_PARTY_LICENSES).
