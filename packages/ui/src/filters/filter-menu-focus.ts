import type { KeyboardEvent } from "react";

function visible(element: HTMLElement) {
  return (
    !element.matches(":disabled, [data-disabled], [aria-disabled=true]") &&
    !element.closest("[hidden], [inert]") &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility !== "hidden"
  );
}

export function focusMenuEditor(root: HTMLDivElement | null) {
  if (!root) return;
  const priorities = [
    "input, textarea",
    '[role="grid"] button[tabindex="0"]',
    '[role^="menuitem"][aria-checked="true"]',
    '[role^="menuitem"]',
    'button, [tabindex="0"]',
  ];
  for (const selector of priorities) {
    const target = [...root.querySelectorAll<HTMLElement>(selector)].find(
      (element) =>
        !element.matches(':disabled, [data-disabled], [aria-disabled="true"]') &&
        element.getClientRects().length > 0,
    );
    if (target) {
      target.focus();
      return;
    }
  }
  root.focus();
}

export function handleMenuTab(
  event: KeyboardEvent<HTMLDivElement>,
  {
    trigger,
    editor,
    onClose,
    hasSelection,
  }: {
    trigger: HTMLButtonElement | null;
    editor: HTMLDivElement | null;
    onClose(): void;
    hasSelection: boolean;
  },
) {
  if (
    event.key !== "Tab" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    !event.currentTarget.contains(event.target as Node)
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  const root = event.currentTarget;
  const target = event.target as HTMLElement;
  const selector = "button, input, textarea, select, a[href], [tabindex]";
  const menuStops = new Set<HTMLElement>();
  root.querySelectorAll<HTMLElement>('[role="menu"]').forEach((menu) => {
    const choices = [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].filter(visible);
    const current =
      choices.find((item) => item === document.activeElement) ??
      choices.find((item) => item.getAttribute("aria-checked") === "true") ??
      choices[0];
    if (current) menuStops.add(current);
  });
  const stops = [...root.querySelectorAll<HTMLElement>(selector)].filter(
    (element) =>
      visible(element) &&
      (element.matches('[role^="menuitem"]') ? menuStops.has(element) : element.tabIndex >= 0),
  );
  const index = stops.indexOf(target);
  const next = index < 0 ? undefined : stops[index + (event.shiftKey ? -1 : 1)];
  if (
    target.closest('[aria-label="Filter types"]') &&
    !event.shiftKey &&
    hasSelection &&
    (!next || editor?.contains(next))
  )
    focusMenuEditor(editor);
  else if (next) next.focus();
  else {
    const button = trigger;
    const outside = [...document.querySelectorAll<HTMLElement>(selector)].filter(
      (element) =>
        visible(element) &&
        element.tabIndex >= 0 &&
        !root.contains(element) &&
        !element.hasAttribute("data-radix-focus-guard"),
    );
    const destination = event.shiftKey ? button : (outside[outside.indexOf(button!) + 1] ?? button);
    destination?.focus();
    onClose();
  }
}

/** Return from editor controls without consuming text, grid, or tree navigation keys. */
export function handleMenuReturn(event: KeyboardEvent<HTMLDivElement>, back: () => void) {
  const target = event.target;
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
  if (event.key !== (rtl ? "ArrowRight" : "ArrowLeft")) return;
  if (!(target instanceof HTMLElement) || target.isContentEditable) return;
  if (
    target.closest(
      'input, textarea, select, [role="grid"], [role="slider"], [role="spinbutton"], [role="combobox"], [role="tablist"], [role="tree"], [role="listbox"]',
    )
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  back();
}

export function preserveOutsideFocus(event: Event) {
  const focused = document.activeElement;
  if (
    event.target instanceof HTMLElement &&
    focused &&
    focused !== document.body &&
    !event.target.contains(focused)
  )
    event.preventDefault();
}
