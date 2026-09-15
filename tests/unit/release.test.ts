import assert from "node:assert/strict";
import { test } from "node:test";
import { developmentVersion, publishTag } from "../../scripts/release/policy.mjs";
import { assertCheckedRun } from "../../scripts/release/checked-run.mjs";

const sha = "a".repeat(40);
const repository = "MendyLanda/mendy-ui";
const checked = {
  path: ".github/workflows/ci.yml",
  conclusion: "success",
  head_branch: "main",
  event: "push",
  repository: { full_name: repository },
  head_repository: { full_name: repository },
  head_sha: sha,
};

test("development versions are deterministic, unique by commit, and below the next stable patch", () => {
  assert.equal(developmentVersion("0.3.1", 42, sha), "0.3.2-dev.42.aaaaaaaaaaaa");
  assert.notEqual(
    developmentVersion("0.3.1", 43, "b".repeat(40)),
    developmentVersion("0.3.1", 42, sha),
  );
  assert.throws(() => developmentVersion("0.3.2-alpha.1", 42, sha));
  assert.throws(() => developmentVersion("0.3.1", 0, sha));
  assert.throws(() => developmentVersion("0.3.1", 42, "not-a-sha"));
});

test("out-of-order CI completion and retries never roll either install channel backward", () => {
  assert.equal(publishTag("0.3.2-dev.42.aaaaaaaaaaaa", undefined), "dev");
  assert.equal(publishTag("0.3.2-dev.43.bbbbbbbbbbbb", "0.3.2-dev.42.aaaaaaaaaaaa"), "dev");
  assert.equal(publishTag("0.3.2-dev.42.aaaaaaaaaaaa", "0.3.2-dev.43.bbbbbbbbbbbb"), "dev-archive");
  assert.equal(publishTag("0.3.2", "0.3.1", true), "latest");
  assert.equal(publishTag("0.3.2", "0.4.0", true), "latest-archive");
  assert.equal(publishTag("0.3.2", "0.3.2", true), "latest");
  assert.throws(() => publishTag("0.3.2-dev.42.aaaaaaaaaaaa", "0.3.1", true));
  assert.throws(() => publishTag("0.3.2", undefined));
});

test("publishing accepts successful main CI only, including explicit retries", () => {
  assert.equal(assertCheckedRun(checked, repository), sha);
  assert.equal(assertCheckedRun({ ...checked, event: "workflow_dispatch" }, repository), sha);
  for (const change of [
    { conclusion: "failure" },
    { conclusion: "cancelled" },
    { head_branch: "feature" },
    { event: "pull_request" },
    { path: ".github/workflows/other.yml" },
    { head_sha: "unknown" },
    { head_repository: { full_name: "someone/fork" } },
    { repository: { full_name: "someone/other" } },
  ]) {
    assert.throws(() => assertCheckedRun({ ...checked, ...change }, repository));
  }
});
