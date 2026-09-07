"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const corners = [
  { value: "square", label: "Square", radius: "0px" },
  { value: "small", label: "Small", radius: "6px" },
  { value: "default", label: "Default", radius: "8px" },
  { value: "rounded", label: "Rounded", radius: "14px" },
];

export function ThemeControls() {
  const [radius, setRadius] = useState("default");
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 p-0 text-xs sm:w-auto sm:px-2"
          aria-label="Customize appearance"
          title="Customize appearance"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Appearance</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        inert={!open}
        aria-hidden={!open || undefined}
        className="data-[state=closed]:animate-none!"
      >
        <DropdownMenuLabel>Corner radius</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={radius}
          onValueChange={(value) => {
            const choice = corners.find((item) => item.value === value);
            if (!choice) return;
            setRadius(value);
            if (value === "default") document.documentElement.style.removeProperty("--radius");
            else document.documentElement.style.setProperty("--radius", choice.radius);
          }}
        >
          {corners.map((choice) => (
            <DropdownMenuRadioItem
              key={choice.value}
              value={choice.value}
              onSelect={(event) => event.preventDefault()}
            >
              {choice.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
