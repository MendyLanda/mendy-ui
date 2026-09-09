import { CopyButton } from "@/components/copy-button";
import { highlightCode } from "@/lib/highlight-code";
import { getDemoSource, getPackageSource } from "@/lib/component-source";

export async function ComponentSource({ name }: { name: string }) {
  const raw = (await getDemoSource(name)) ?? (await getPackageSource(name));
  if (!raw) throw new Error(`Missing component source: ${name}`);
  const code = raw;
  const html = await highlightCode(code);
  return (
    <details className="my-4 rounded-lg border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">View source</summary>
      <div className="relative max-h-[32rem] overflow-auto border-t bg-muted/30">
        <CopyButton value={code} />
        <div className="pr-10" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </details>
  );
}
