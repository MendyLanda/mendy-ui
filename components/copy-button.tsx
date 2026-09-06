"use client";
import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  className,
  label = "Copy code",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 2000);
  }
  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        onClick={copy}
        aria-label={status === "copied" ? "Copied" : label}
        className={cn("absolute right-2 top-2", className)}
      >
        {status === "copied" ? <Check /> : <Copy />}
      </Button>
      <span role="status" className="sr-only">
        {status === "copied"
          ? "Copied to clipboard"
          : status === "error"
            ? "Could not copy. Select and copy the code manually."
            : ""}
      </span>
    </>
  );
}
