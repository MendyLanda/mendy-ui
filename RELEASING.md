# Releasing Mendy UI

The npm package is `packages/ui`. The documentation site consumes its compiled workspace exports. Package versions and website deployments are separate operations.

## First publication

1. Log in to the npm account that owns the `@mendylanda` scope with `npm login`. Confirm the account with `npm whoami`.
2. Run `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test:unit`, `pnpm test`, and `pnpm verify:consumers`.
3. Run `pnpm package:pack`. Inspect the archive in `artifacts/`; it should contain the compiled package, declarations, scoped stylesheet, README, and licenses.
4. Publish that archive with `npm publish ./artifacts/mendylanda-ui-0.1.0.tgz --access public`. npm may request account authentication or 2FA. Never put credentials in the repository.
5. Confirm `npm view @mendylanda/ui@0.1.0 version`, then merge the migration and deploy the website. Do not replace the live installation instructions before the package exists.

## Subsequent versions

Update `packages/ui/package.json`, its workspace lockfile, and `CHANGELOG.md` together. Use patches for compatible fixes and minor releases for additions. During `0.x`, document any breaking changes in a new minor version. Projects update their dependency and lockfile, then test and deploy.

The `publish.yml` workflow validates and publishes the checked-out package version. Configure npm trusted publishing for GitHub owner `MendyLanda`, repository `mendy-ui`, and workflow filename `publish.yml`. Enable direct publishing for that trusted publisher. The workflow uses a GitHub-hosted runner and OIDC, with no npm token stored in the repository.

See [npm's trusted publishing instructions](https://docs.npmjs.com/trusted-publishers/) for the account setup. After configuration, run the **Publish npm package** workflow from main. It fails if the version already exists. Releases are explicit; ordinary website deployments do not publish npm versions.
