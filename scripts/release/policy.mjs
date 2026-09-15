import semver from "semver";

export function developmentVersion(version, count, sha) {
  if (!semver.valid(version) || semver.prerelease(version)) {
    throw new Error("Development builds require a stable package version.");
  }
  if (!Number.isSafeInteger(count) || count < 1 || !/^[a-f0-9]{40}$/.test(sha)) {
    throw new Error("Invalid commit count or SHA.");
  }
  return `${semver.inc(version, "patch")}-dev.${count}.${sha.slice(0, 12)}`;
}

export function publishTag(version, current, stable = false) {
  if (!semver.valid(version) || (current && !semver.valid(current))) {
    throw new Error("Invalid registry version.");
  }
  if (stable === Boolean(semver.prerelease(version))) {
    throw new Error("The version does not match the requested release channel.");
  }
  // Every checked commit gets a version, even if its CI finished out of order.
  // Archive tags prevent those older versions from rolling a channel backward.
  const channel = stable ? "latest" : "dev";
  return current && semver.gt(current, version) ? `${channel}-archive` : channel;
}
