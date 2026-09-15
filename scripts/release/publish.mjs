import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { developmentVersion, publishTag } from "./policy.mjs";

const sha = process.env.RELEASE_SHA;
const repository = process.env.GITHUB_REPOSITORY;
if (!/^[a-f0-9]{40}$/.test(sha ?? "") || repository !== "MendyLanda/mendy-ui") {
  throw new Error("Invalid release source.");
}
const directory = resolve("release-package/package");
const manifestPath = resolve(directory, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.name !== "@mendylanda/ui") throw new Error("Unexpected package.");
const stableVersion = manifest.version;
const count = Number(execFileSync("git", ["rev-list", "--count", sha], { encoding: "utf8" }));
const previousManifest = JSON.parse(
  execFileSync("git", ["show", `${sha}^:packages/ui/package.json`], { encoding: "utf8" }),
);
let releaseCommit = previousManifest.version !== stableVersion;

async function registry(path) {
  const response = await fetch(
    path === "/dist-tags"
      ? "https://registry.npmjs.org/-/package/@mendylanda%2fui/dist-tags"
      : `https://registry.npmjs.org/@mendylanda%2fui${path}`,
  );
  if (response.status === 404 && path !== "/dist-tags") return null;
  if (!response.ok) throw new Error(`npm registry returned ${response.status}`);
  return response.json();
}

async function publish(version, stable) {
  const [existing, tags] = await Promise.all([registry(`/${version}`), registry("/dist-tags")]);
  if (existing && existing.gitHead !== sha) {
    throw new Error(`${version} already exists from a different or unidentified commit.`);
  }
  const channel = stable ? "latest" : "dev";
  const tag = publishTag(version, tags?.[channel], stable);
  if (!existing) {
    writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifest, version, gitHead: sha }, null, 2) + "\n",
    );
    const packed = JSON.parse(
      execFileSync("npm", ["pack", "--ignore-scripts", "--json"], {
        cwd: directory,
        encoding: "utf8",
      }),
    );
    execFileSync(
      "npm",
      [
        "publish",
        resolve(directory, packed[0].filename),
        "--access",
        "public",
        "--provenance",
        "--tag",
        tag,
      ],
      {
        stdio: "inherit",
      },
    );
  } else if (!tag.endsWith("-archive") && tags?.[tag] !== version) {
    throw new Error(
      `${version} exists but ${tag} points elsewhere. Inspect npm dist-tags before retrying.`,
    );
  }
  const line = `${manifest.name}@${version} (${tag})${existing ? " already published" : " published"}`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `- ${line}\n`);
}

// A stable version is eligible only at the exact commit tagged by release-please.
// A later main commit with the same manifest version must never ship as stable.
const releaseResponse = await fetch(
  `https://api.github.com/repos/${repository}/releases/tags/v${stableVersion}`,
  {
    headers: {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
    },
  },
);
if (!releaseResponse.ok && releaseResponse.status !== 404) {
  throw new Error(`GitHub release lookup returned ${releaseResponse.status}`);
}
let stable = false;
if (releaseResponse.ok) {
  const release = await releaseResponse.json();
  const tagSha = execFileSync("git", ["rev-parse", `v${stableVersion}^{commit}`], {
    encoding: "utf8",
  }).trim();
  if (tagSha === sha) {
    releaseCommit = true;
    stable = !release.draft && !release.prerelease;
  }
}
// Release Please and CI run independently. A version bump whose release is not
// ready must never accidentally publish a development snapshot instead.
if (releaseCommit && !stable) {
  throw new Error(
    `Release commit ${sha} is waiting for a published v${stableVersion} release at that exact commit. Retry after Prepare release succeeds.`,
  );
}
if (stable) await publish(stableVersion, true);
else await publish(developmentVersion(stableVersion, count, sha), false);
