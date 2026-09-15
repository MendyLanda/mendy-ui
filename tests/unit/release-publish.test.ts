import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const sha = "a".repeat(40);
const version = "0.3.2-dev.17.aaaaaaaaaaaa";
const publisher = resolve("scripts/release/publish.mjs");

function runPublisher(fixture: Record<string, unknown> = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "mendy-release-test-"));
  try {
    mkdirSync(join(cwd, "release-package/package"), { recursive: true });
    writeFileSync(
      join(cwd, "release-package/package/package.json"),
      JSON.stringify({
        name: "@mendylanda/ui",
        version: "0.3.1",
        exports: { ".": "./dist/index.js" },
      }),
    );
    writeFileSync(join(cwd, "fixture.json"), JSON.stringify(fixture));
    // Run the real publishing entry point, replacing only external services and
    // subprocesses. These tests can never upload a package or contact npm.
    writeFileSync(
      join(cwd, "services.mjs"),
      `
      import cp from 'node:child_process';
      import { syncBuiltinESMExports } from 'node:module';
      import fs from 'node:fs';
      const fixture = JSON.parse(fs.readFileSync('fixture.json', 'utf8'));
      cp.execFileSync = (command, args) => {
        fs.appendFileSync('commands.jsonl', JSON.stringify([command, args]) + '\\n');
        if (command === 'git' && args[0] === 'rev-list') return '17';
        if (command === 'git' && args[0] === 'rev-parse') return fixture.tagSha ?? '${sha}';
        if (command === 'git' && args[0] === 'show') return JSON.stringify({version: fixture.parentVersion ?? '0.3.1'});
        if (command === 'npm' && args[0] === 'pack') return '[{"filename":"package.tgz"}]';
        if (command === 'npm' && args[0] === 'publish') return '';
        throw new Error('Unexpected subprocess');
      };
      syncBuiltinESMExports();
      globalThis.fetch = async (url) => {
        if (url.startsWith('https://api.github.com/'))
          return new Response(JSON.stringify(fixture.release ?? {}), { status: fixture.release ? 200 : 404 });
        if (url === 'https://registry.npmjs.org/-/package/@mendylanda%2fui/dist-tags')
          return new Response(JSON.stringify(fixture.tags ?? {}));
        const version = url.split('/').at(-1);
        if (!url.startsWith('https://registry.npmjs.org/@mendylanda%2fui/') || !/^[0-9]/.test(version)) throw new Error('Unexpected URL: ' + url);
        const existing = fixture.existing?.[version];
        return new Response(JSON.stringify(existing ?? {}), { status: fixture.registryFailure ?? (existing ? 200 : 404) });
      };
    `,
    );
    const result = spawnSync(process.execPath, ["--import", join(cwd, "services.mjs"), publisher], {
      cwd,
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        RELEASE_SHA: sha,
        GITHUB_REPOSITORY: "MendyLanda/mendy-ui",
        GH_TOKEN: "test-only",
      },
    });
    const commands = readFileSync(join(cwd, "commands.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as [string, string[]]);
    const manifest = JSON.parse(
      readFileSync(join(cwd, "release-package/package/package.json"), "utf8"),
    );
    return {
      ...result,
      commands,
      manifest,
      uploads: commands.filter(([cmd, args]) => cmd === "npm" && args[0] === "publish"),
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("ordinary main build uploads only dev and preserves package exports", () => {
  const run = runPublisher();
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.uploads.length, 1);
  assert.equal(run.uploads[0][1].at(-1), "dev");
  assert.equal(run.manifest.version, version);
  assert.equal(run.manifest.gitHead, sha);
  assert.deepEqual(run.manifest.exports, { ".": "./dist/index.js" });
});

test("release commits publish only stable, with no development snapshot", () => {
  const stable = runPublisher({
    parentVersion: "0.3.0",
    release: { draft: false, prerelease: false },
  });
  assert.equal(stable.status, 0, stable.stderr);
  assert.deepEqual(
    stable.uploads.map(([, args]) => args.at(-1)),
    ["latest"],
  );
  assert.equal(stable.manifest.version, "0.3.1");
});

test("release commits cannot fall back to dev before the published release is ready", () => {
  for (const fixture of [
    {},
    { release: { draft: true } },
    { release: { prerelease: true } },
    { release: {}, tagSha: "b".repeat(40) },
  ]) {
    const run = runPublisher({ parentVersion: "0.3.0", ...fixture });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /waiting for a published v0\.3\.1 release at that exact commit/);
    assert.equal(run.uploads.length, 0);
  }
});

test("ordinary commits after a stable release resume dev publication", () => {
  const run = runPublisher({
    release: { draft: false, prerelease: false },
    tagSha: "b".repeat(40),
  });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(
    run.uploads.map(([, args]) => args.at(-1)),
    ["dev"],
  );
});

test("stable retries do not create dev snapshots or roll latest backward", () => {
  for (const latest of ["0.3.1", "0.4.0"]) {
    const run = runPublisher({
      parentVersion: "0.3.0",
      release: { draft: false, prerelease: false },
      existing: { "0.3.1": { gitHead: sha } },
      tags: { latest },
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.uploads.length, 0);
  }
});

test("retries skip published versions and reject a conflicting commit", () => {
  const retry = runPublisher({ existing: { [version]: { gitHead: sha } }, tags: { dev: version } });
  assert.equal(retry.status, 0, retry.stderr);
  assert.equal(retry.uploads.length, 0);
  const conflict = runPublisher({ existing: { [version]: { gitHead: "b".repeat(40) } } });
  assert.notEqual(conflict.status, 0);
  assert.equal(conflict.uploads.length, 0);
});

test("late builds publish without rolling dev back, and older retries are harmless", () => {
  const tags = { dev: "0.3.2-dev.18.bbbbbbbbbbbb" };
  const late = runPublisher({ tags });
  assert.equal(late.status, 0, late.stderr);
  assert.equal(late.uploads[0][1].at(-1), "dev-archive");
  const retry = runPublisher({ tags, existing: { [version]: { gitHead: sha } } });
  assert.equal(retry.status, 0, retry.stderr);
  assert.equal(retry.uploads.length, 0);
});

test("registry errors fail closed instead of attempting an upload", () => {
  const run = runPublisher({ registryFailure: 503 });
  assert.notEqual(run.status, 0);
  assert.equal(run.uploads.length, 0);
});
