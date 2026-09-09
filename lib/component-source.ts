import path from "node:path";

import { readFile } from "node:fs/promises";

export const readOptionalFromRoot = async (relativePath: string): Promise<string | null> => {
  try {
    return await readFile(
      path.join(/* turbopackIgnore: true */ process.cwd(), relativePath),
      "utf8",
    );
  } catch {
    return null;
  }
};

export const getPackageSourceCandidates = ({ name }: { name: string }) => [
  path.join("packages", "ui", "src", "filters", `${name}.tsx`),
  path.join("packages", "ui", "src", "filters", `${name}.ts`),
];

export const getDemoSource = (name: string): Promise<string | null> =>
  readOptionalFromRoot(path.join("examples", `${name}.tsx`));

export const getPackageSource = async (name: string): Promise<string | null> => {
  const candidates = getPackageSourceCandidates({ name });

  for (const candidate of candidates) {
    const code = await readOptionalFromRoot(candidate);
    if (code) {
      return code;
    }
  }

  return null;
};
