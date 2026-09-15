# Releasing Mendy UI

## Daily development

Push to `main`. After the **Check and deploy** workflow succeeds, **Publish npm package** publishes an immutable development build under `dev`:

```sh
npm install @mendylanda/ui@dev
```

For example, stable `0.3.1` produces `0.3.2-dev.123.abcdef123456`. The number is the Git commit count; the suffix identifies the source commit. These are snapshots, not a prediction of the next stable version. A feature can still make the next stable release `0.4.0`.

Every successful main push gets a snapshot, including documentation changes, except release commits, which publish only stable. Main checks are not cancelled by newer pushes. Publishing queues up to 100 pending runs. If checks finish out of order, the older package is still published, but an archive tag keeps it from replacing the newer `dev` channel. Retries reuse the same version and verify its source commit.

Failed or cancelled CI, feature branches, and pull requests cannot publish. The publisher downloads the package artifact from the exact successful CI run. It changes only version/source metadata before publishing, retaining the compiled files checked by the browser, stress, and fresh-consumer jobs. It uses npm provenance and GitHub OIDC rather than an npm token.

## Stable releases

**Prepare release** maintains a release PR containing the next version and generated `CHANGELOG.md` entry. Review that PR and squash-merge it when ready to ship. There is no automatic merge.

Merging creates a GitHub release and `vX.Y.Z` tag. Once the merged commit passes main CI, the publisher releases that exact commit to `latest` only. It does not create a development snapshot or move `dev`; ordinary commits after the release resume dev publishing. A GitHub release alone is not proof that npm publishing succeeded; check **Publish npm package**.

If main CI finishes before the release is ready, a commit that changes the package version stops without publishing either channel. Retry the publisher after **Prepare release** succeeds. Retrying a completed stable publication also does not create a development snapshot.

```sh
npm install @mendylanda/ui
```

Release Please updates the root/package versions and manifest together. Do not bump versions or write new changelog sections manually. Existing historical entries are preserved. Release notes accumulate in the open PR until you merge it; this avoids bot commits on every push.

`fix` and `perf` produce patches; `feat` produces a minor. Mark incompatible changes with `!` or a `BREAKING CHANGE:` footer. Before 1.0, breaking changes produce a minor; from 1.0 they produce a major. For an intentional version override such as 1.0.0, use Release Please's `Release-As: 1.0.0` commit footer and review the generated PR.

Release PRs use the built-in `GITHUB_TOKEN`. GitHub holds bot-triggered PR workflows for approval, so **Prepare release** explicitly dispatches CI on the release branch and reports its result as **Release checks** on the PR. You can ignore the redundant approval-required run. No personal GitHub token is required.

## Commit messages

Use Conventional Commits locally and in PR titles:

```text
feat(table): add grouped headers
fix(filters): preserve input focus when switching editors
perf(table): reuse column measurements
feat(table)!: replace the selection API
```

Other supported types are `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `style`, and `revert`. The subject must be nonempty and the header is limited to 100 characters. A scope is optional. Use the body for detail and migration notes.

`pnpm install` sets up the Husky commit-message hook. CI validates pushed main commits and PR titles. PRs squash-merge using the title, so work-in-progress branch commits can stay informal. Main history remains standardized. Historical commits before this setup are not rewritten.

## One-time npm setup

Open [the package settings](https://www.npmjs.com/package/@mendylanda/ui/access) and add a **GitHub Actions** trusted publisher:

| Field                     | Value                       |
| ------------------------- | --------------------------- |
| Organization or user      | `MendyLanda`                |
| Repository                | `mendy-ui`                  |
| Workflow filename         | `publish.yml`               |
| Environment               | `npm`                       |
| Allowed actions, if shown | Enable direct `npm publish` |

The repository's `npm` environment allows main only. It has no manual approval gate, because merging the release PR controls stable releases and development builds should be automatic. Keep your account's normal 2FA. This workflow does not need `NPM_TOKEN` or a 2FA exemption token.

See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/). Publishing uses Node 24 and npm 11 on GitHub-hosted runners.

## Recovery

If **Prepare release** fails, rerun it or dispatch it on main. If npm authentication fails, check that all trusted-publisher fields match, including the environment and direct-publish permission.

To retry a failed publication, rerun **Publish npm package**, or dispatch it on main with the successful **Check and deploy** run ID. It verifies the run's repository, workflow, event, branch, and conclusion. A different commit cannot replace an existing npm version. An older retry cannot roll `latest` or `dev` backward.

If the checked package artifact expired, dispatch **Check and deploy** on main and then dispatch the publisher using that run ID. To recover an older release artifact, rerun that commit's original CI run. Never rebuild a historical stable version from today's main.

If npm accepted an upload but the channel points elsewhere unexpectedly, the workflow stops with the version and tag to inspect. Resolve that registry discrepancy before retrying.

Documentation deploys independently of the npm channels after successful main CI. Docs on main can describe unreleased development work; consumers should choose `dev` when trying those changes before a stable release.
