import { CopyButton } from "@/components/copy-button";

export function InstallCommand({ item = "filters" }: { item?: string }) {
  const command = `npx shadcn@latest add https://ui.mendylanda.com/r/${item}.json`;
  return (
    <div className="relative rounded-lg border bg-muted/40">
      <pre
        tabIndex={0}
        aria-label="Install command"
        className="overflow-x-auto p-4 pr-14 text-xs leading-6 sm:text-sm"
      >
        <code>{command}</code>
      </pre>
      <CopyButton value={command} label="Copy install command" />
    </div>
  );
}
