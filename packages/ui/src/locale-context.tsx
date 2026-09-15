"use client";
import { createContext, useContext } from "react";
import { createLocale } from "./locale.js";
export const LocaleContext = createContext({ ...createLocale(), configured: false });
/** Use the same translations and formatting in custom editors and table controls. */
export function useMendyLocale() {
  return useContext(LocaleContext);
}
