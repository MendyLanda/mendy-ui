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

export const getRegistryUiSourceCandidates = ({ name }: { name: string }) => [
  path.join("registry", "new-york", `${name}.tsx`),
];

export const getDemoSource = (name: string): Promise<string | null> =>
  readOptionalFromRoot(path.join("examples", `${name}.tsx`));

export const getRegistrySource = async (name: string): Promise<string | null> => {
  const candidates = getRegistryUiSourceCandidates({ name });

  for (const candidate of candidates) {
    const code = await readOptionalFromRoot(candidate);
    if (code) {
      return code;
    }
  }

  return null;
};
