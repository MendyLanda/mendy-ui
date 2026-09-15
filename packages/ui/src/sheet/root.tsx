"use client";
import type { ReactNode } from "react";
import {
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SheetControlsContext, SheetInstanceContext, SheetStackContext } from "./context.js";
import type { SheetGuardMessages } from "./context.js";
import type { SheetCloseReason, SheetSide } from "./types.js";
import { SheetProvider } from "./provider.js";
import { CloseConfirmation } from "./sheet-guard.js";

export interface SheetProps {
  children: ReactNode;
  id?: string;
  /** Opening sequence for route-driven sheets whose code may load out of order. */
  order?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  pinned?: boolean;
  defaultPinned?: boolean;
  onPinnedChange?: (pinned: boolean) => void;
  pinnable?: boolean;
  /** Logical end by default: right in LTR, left in RTL. */
  side?: SheetSide;
  /** Desired width in CSS pixels. Clamped to the available viewport. */
  width?: number;
  /** Return false to prevent a user/API close request. Controlled prop changes remain authoritative. */
  onBeforeClose?: (reason: SheetCloseReason) => boolean | void;
}
export function SheetRoot(props: SheetProps) {
  const stack = useContext(SheetStackContext);
  return stack ? (
    <SheetInstance {...props} />
  ) : (
    <SheetProvider>
      <SheetInstance {...props} />
    </SheetProvider>
  );
}
function SheetInstance({
  children,
  id: explicitId,
  order,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  pinned: controlledPinned,
  defaultPinned = false,
  onPinnedChange,
  pinnable = true,
  side = "end",
  width: requestedWidth = 520,
  onBeforeClose,
}: SheetProps) {
  const stack = useContext(SheetStackContext)!;
  const generatedId = useId();
  const id = explicitId ?? generatedId;
  const width = Number.isFinite(requestedWidth) ? Math.max(240, requestedWidth) : 520;
  const [descriptionId, setDescriptionId] = useState<string>();
  const registerDescription = useCallback((id: string) => {
    setDescriptionId(id);
    return () => setDescriptionId((current) => (current === id ? undefined : current));
  }, []);
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const [ownPinned, setOwnPinned] = useState(defaultPinned);
  const open = controlledOpen ?? ownOpen;
  const pinned = controlledPinned ?? ownPinned;
  const getLayout = useCallback(() => stack.store.getSheet(id), [stack.store, id]);
  const layout = useSyncExternalStore(stack.store.subscribe, getLayout, getLayout);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const guards = useRef(new Map<symbol, () => { dirty: boolean; messages?: SheetGuardMessages }>());
  const [confirmation, setConfirmation] = useState<{ messages?: SheetGuardMessages } | null>(null);
  const registerGuard = useCallback(
    (read: () => { dirty: boolean; messages?: SheetGuardMessages }) => {
      const key = Symbol();
      guards.current.set(key, read);
      return () => {
        guards.current.delete(key);
      };
    },
    [],
  );
  const setPinned = useCallback(
    (next: boolean) => {
      if (pinned === next) return;
      if (controlledPinned === undefined) setOwnPinned(next);
      onPinnedChange?.(next);
    },
    [pinned, controlledPinned, onPinnedChange],
  );
  const setOpen = useCallback(
    (next: boolean) => {
      if (open === next) return;
      if (!next) {
        setConfirmation(null);
        setPinned(false);
      }
      if (controlledOpen === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [open, controlledOpen, onOpenChange, setPinned],
  );
  const requestClose = useCallback(
    (reason: SheetCloseReason = "programmatic") => {
      if (onBeforeClose?.(reason) === false) return;
      for (const read of guards.current.values()) {
        const guard = read();
        if (guard.dirty) {
          setConfirmation({ messages: guard.messages });
          return;
        }
      }
      setOpen(false);
    },
    [onBeforeClose, setOpen],
  );
  // Stable handlers read the most recent committed props, without resubscribing the stack.
  const actions = useRef({ requestClose, setPinned, setOpen });
  useLayoutEffect(() => {
    actions.current = { requestClose, setPinned, setOpen };
  });
  useLayoutEffect(
    () =>
      stack.store.register(id, {
        reopen: () => actions.current.setOpen(true),
        close: (reason) => actions.current.requestClose(reason),
        pin: (next) => actions.current.setPinned(next),
        focus: () => contentRef.current?.focus({ preventScroll: true }),
      }),
    [stack.store, id],
  );
  useLayoutEffect(() => {
    if (open) stack.store.update(id, { side, width, pinned, pinnable, requestedOrder: order });
    else stack.store.remove(id);
  }, [stack.store, id, open, side, width, pinned, pinnable, order]);
  const controls = useMemo(
    () => ({
      open,
      pinned,
      docked: layout?.pinned ?? false,
      close: (reason?: SheetCloseReason) => actions.current.requestClose(reason),
      pin: () => stack.store.pin(id),
      unpin: () => actions.current.setPinned(false),
      registerGuard,
    }),
    [open, pinned, layout?.pinned, stack.store, id, registerGuard],
  );
  const value = useMemo(
    () => ({
      id,
      open,
      pinned,
      pinnable,
      side,
      width,
      layout,
      descriptionId,
      registerDescription,
      contentRef,
      triggerRef,
      requestClose,
      setOpen,
      setPinned,
      registerGuard,
    }),
    [
      id,
      open,
      pinned,
      pinnable,
      side,
      width,
      layout,
      requestClose,
      setOpen,
      setPinned,
      registerGuard,
      descriptionId,
      registerDescription,
    ],
  );
  return (
    <SheetControlsContext.Provider value={controls}>
      <SheetInstanceContext.Provider value={value}>
        <Dialog.Root
          open={open}
          modal={false}
          onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
        >
          {children}
        </Dialog.Root>
        <CloseConfirmation
          open={open && confirmation !== null}
          messages={confirmation?.messages}
          onCancel={() => setConfirmation(null)}
          onDiscard={() => setOpen(false)}
          onPin={
            layout?.canPin && !pinned
              ? () => {
                  setPinned(true);
                  setConfirmation(null);
                }
              : undefined
          }
        />
      </SheetInstanceContext.Provider>
    </SheetControlsContext.Provider>
  );
}
