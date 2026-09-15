import type { ReactNode } from "react";

export type SheetSide = "start" | "end";
export type SheetCloseReason = "close-button" | "escape" | "outside" | "programmatic";
export type SheetJson =
  | null
  | boolean
  | number
  | string
  | SheetJson[]
  | { [key: string]: SheetJson };
/** Only identifiers needed to fetch a record again. Form drafts are never saved automatically. */
export interface SheetRecord {
  id: string;
  type: string;
  payload?: SheetJson;
}
export interface SheetPersistence {
  /** Scope this key to the signed-in user and workspace. Changing it resets managed sheets. */
  key: string;
  /** Defaults to sessionStorage. Access is deferred until mount. */
  storage?: Pick<Storage, "getItem" | "setItem">;
  /** Return sheet content, or null for records that no longer exist or are accessible. */
  resolve: (record: SheetRecord) => ReactNode;
  onError?: (error: unknown) => void;
}
export interface OpenSheetOptions {
  /** Opening an existing id brings that instance forward without losing its state. */
  id: string;
  render: () => ReactNode;
  side?: SheetSide;
  width?: number;
  pinnable?: boolean;
  /** Opt this instance into reload restoration. */
  persist?: Omit<SheetRecord, "id">;
}
export interface SheetController {
  open: (options: OpenSheetOptions) => void;
  /** Uses the same unsaved-changes guard as the close button. */
  close: (id: string) => void;
  closeTop: () => void;
  pin: (id: string) => void;
  unpin: (id: string) => void;
}
export interface SheetLayout {
  offset: number;
  width: number;
  pinned: boolean;
  covered: boolean;
  top: boolean;
  canPin: boolean;
  modal: boolean;
}
