"use client";

import type { ComponentProps, ComponentType, ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { Button as DefaultButton } from "./primitives/button.js";
import { Input as DefaultInput } from "./primitives/input.js";
import { Textarea as DefaultTextarea } from "./primitives/textarea.js";
import { Label as DefaultLabel } from "./primitives/label.js";
import { Calendar as DefaultCalendar } from "./primitives/calendar.js";

export interface MendyUIComponents {
  Button: ComponentType<ComponentProps<typeof DefaultButton>>;
  Input: ComponentType<ComponentProps<typeof DefaultInput>>;
  Textarea: ComponentType<ComponentProps<typeof DefaultTextarea>>;
  Label: ComponentType<ComponentProps<typeof DefaultLabel>>;
  Calendar: ComponentType<ComponentProps<typeof DefaultCalendar>>;
}
export type FilterPart =
  | "root"
  | "search"
  | "searchInput"
  | "menuTrigger"
  | "menu"
  | "menuList"
  | "menuRow"
  | "menuHeader"
  | "editor"
  | "chip"
  | "chipTrigger"
  | "chipRemove"
  | "option"
  | "clear";
export type FilterClassNames = Partial<Record<FilterPart, string>>;
export interface MendyUIOptions {
  /** Desktop editor placement. Phones always use one panel with Back. */
  menuLayout?: "connected" | "anchored";
  /** Animate chip editor popups. Off by default; chip entrance motion is independent. */
  editorAnimation?: boolean;
  components?: Partial<MendyUIComponents>;
  classNames?: FilterClassNames;
  /** Mount dropdowns inside a local theme or dialog instead of document.body. */
  portalContainer?: HTMLElement | null;
}
const Context = createContext<MendyUIOptions>({});

/** Nested providers inherit defaults; local settings override matching keys. */
export function MendyUIProvider({
  children,
  components,
  classNames,
  portalContainer,
  menuLayout,
  editorAnimation,
}: MendyUIOptions & { children: ReactNode }) {
  const parent = useContext(Context);
  const value = useMemo(
    () => ({
      menuLayout: menuLayout ?? parent.menuLayout,
      editorAnimation: editorAnimation ?? parent.editorAnimation,
      components: { ...parent.components, ...components },
      classNames: { ...parent.classNames, ...classNames },
      portalContainer: portalContainer === undefined ? parent.portalContainer : portalContainer,
    }),
    [parent, components, classNames, portalContainer, menuLayout, editorAnimation],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMendyUI() {
  return useContext(Context);
}

export function Button(props: ComponentProps<typeof DefaultButton>) {
  const Control = useMendyUI().components?.Button ?? DefaultButton;
  return <Control data-mendy-ui="" {...props} />;
}
export function Input(props: ComponentProps<typeof DefaultInput>) {
  const Control = useMendyUI().components?.Input ?? DefaultInput;
  return <Control data-mendy-ui="" {...props} />;
}
export function Textarea(props: ComponentProps<typeof DefaultTextarea>) {
  const Control = useMendyUI().components?.Textarea ?? DefaultTextarea;
  return <Control data-mendy-ui="" {...props} />;
}
export function Label(props: ComponentProps<typeof DefaultLabel>) {
  const Control = useMendyUI().components?.Label ?? DefaultLabel;
  return <Control data-mendy-ui="" {...props} />;
}
export function Calendar(props: ComponentProps<typeof DefaultCalendar>) {
  const Control = useMendyUI().components?.Calendar ?? DefaultCalendar;
  return <Control {...props} />;
}
