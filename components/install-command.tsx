import { CopyButton } from "@/components/copy-button";

export function InstallCommand({ item = "filters" }: { item?: string }) {
  const command = `npx shadcn@latest add https://ui.mendylanda.com/r/${item}.json`;
  return (
    <div className="flex rounded-md border bg-muted">
      <pre
        tabIndex={0}
        aria-label="Install command"
        className="min-w-0 flex-1 overflow-x-auto p-4 text-xs leading-6 sm:text-sm"
      >
        <code>{command}</code>
      </pre>
      <CopyButton
        value={command}
        label="Copy install command"
        className="static m-2 shrink-0 self-center"
      />
    </div>
  );
}
