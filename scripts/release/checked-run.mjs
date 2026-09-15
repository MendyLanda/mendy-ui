export function assertCheckedRun(run, repository) {
  if (
    run.path !== ".github/workflows/ci.yml" ||
    run.conclusion !== "success" ||
    run.head_branch !== "main" ||
    !["push", "workflow_dispatch"].includes(run.event) ||
    run.repository?.full_name !== repository ||
    run.head_repository?.full_name !== repository ||
    !/^[a-f0-9]{40}$/.test(run.head_sha)
  ) {
    throw new Error("Publishing requires successful main CI from this repository.");
  }
  return run.head_sha;
}
