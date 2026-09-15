import { SheetRoot } from "./root.js";
import {
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPin,
  SheetTitle,
  SheetTrigger,
} from "./parts.js";
export const Sheet = Object.assign(SheetRoot, {
  Trigger: SheetTrigger,
  Content: SheetContent,
  Header: SheetHeader,
  Body: SheetBody,
  Footer: SheetFooter,
  Title: SheetTitle,
  Description: SheetDescription,
  Close: SheetClose,
  Pin: SheetPin,
});
export * from "./parts.js";
export * from "./provider.js";
export { useSheetCloseGuard } from "./sheet-guard.js";
export type { SheetGuardMessages } from "./context.js";
export type { SheetProps } from "./root.js";
export type {
  SheetSide,
  SheetCloseReason,
  SheetController,
  SheetJson,
  SheetRecord,
  SheetPersistence,
  OpenSheetOptions,
} from "./types.js";
