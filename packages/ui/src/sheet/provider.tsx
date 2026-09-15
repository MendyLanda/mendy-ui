"use client";
import type { ReactNode } from "react";
import {
  memo,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { useMendyUI } from "../customization.js";
import { useMendyLocale } from "../locale-context.js";
import { cn } from "../utils.js";
import { SheetStackContext } from "./context.js";
import type { ManagedSheetOptions } from "./store.js";
import { createSheetStore } from "./store.js";
import { SheetRoot } from "./root.js";
import { lockSheetScroll } from "./scroll-lock.js";
import { readSheetRecords } from "./persistence.js";
import type { SheetController, SheetPersistence } from "./types.js";

export interface SheetProviderProps {
  children: ReactNode;
  /** Supply once above the router outlet to retain managed sheets across navigation. */
  persistence?: SheetPersistence;
  /** Opening and layout motion is enabled by default, and respects reduced motion. */
  animation?: boolean;
  className?: string;
}
export function SheetProvider(props: SheetProviderProps) {
  // A different account/workspace must never inherit another scope's open instances.
  return <ProviderScope key={props.persistence?.key ?? "default"} {...props} />;
}
function ProviderScope({ children, persistence, animation = true, className }: SheetProviderProps) {
  const [store] = useState(createSheetStore);
  const [mounted, setMounted] = useState(false);
  useLayoutEffect(() => {
    setMounted(true);
  }, []);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const settings = useMendyUI();
  const { direction } = useMendyLocale();
  const layout = useSyncExternalStore(store.subscribe, store.getLayout, store.getLayout);
  const managed = useSyncExternalStore(store.subscribe, store.getManaged, store.getManaged);
  const pageRef = useRef<HTMLDivElement>(null);
  const persistenceRef = useRef(persistence);
  useLayoutEffect(() => {
    persistenceRef.current = persistence;
  });
  const value = useMemo(
    () => ({ store, container, animation, pageRef }),
    [store, container, animation],
  );
  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        store.setViewport(window.innerWidth);
      });
    };
    store.setViewport(window.innerWidth);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
    };
  }, [store]);
  useEffect(() => {
    const config = persistenceRef.current;
    if (!config) return;
    let storage: Pick<Storage, "getItem" | "setItem">;
    try {
      storage = config.storage ?? window.sessionStorage;
      for (const record of readSheetRecords(storage.getItem(config.key))) {
        try {
          const content = config.resolve(record);
          if (content == null) continue;
          store.restore({
            side: record.side,
            width: record.width,
            id: record.id,
            persist: { type: record.type, payload: record.payload },
            render: () => content,
          });
        } catch (error) {
          config.onError?.(error);
        }
      }
    } catch (error) {
      config.onError?.(error);
      return;
    }
    let last = "";
    // Coalesce mount and pin updates, avoiding writes for viewport/layout-only changes.
    let queued = false;
    let disposed = false;
    const save = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (disposed) return;
        try {
          const next = JSON.stringify({ version: 1, sheets: store.records() });
          if (next !== last) {
            storage.setItem(config.key, next);
            last = next;
          }
        } catch (error) {
          persistenceRef.current?.onError?.(error);
        }
      });
    };
    const unsubscribe = store.subscribe(save);
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [store]);
  const hasOverlay = layout.hasOverlay;
  useEffect(() => {
    if (!hasOverlay) return;
    return lockSheetScroll(document);
  }, [hasOverlay]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.key.toLowerCase() !== "p" ||
        !(target instanceof Element) ||
        !container?.contains(target) ||
        target.closest(
          "input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=textbox],[role=combobox],[role=menu],[role=listbox],[role=alertdialog]",
        )
      )
        return;
      if (store.pinTop()) event.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [store, container]);
  return (
    <SheetStackContext.Provider value={value}>
      <div
        data-mendy-sheet-page=""
        ref={pageRef}
        tabIndex={-1}
        dir={direction}
        inert={hasOverlay || undefined}
        className={cn(
          "min-w-0",
          animation && "transition-[padding] duration-300 motion-reduce:transition-none",
          className,
        )}
        style={{ paddingInlineStart: layout.startWidth, paddingInlineEnd: layout.endWidth }}
      >
        {children}
      </div>
      {mounted &&
        createPortal(
          <div
            data-mendy-ui=""
            data-mendy-sheet-host=""
            dir={direction}
            ref={setContainer}
            className="pointer-events-none fixed inset-0 z-50"
          >
            {hasOverlay && (
              <div
                data-mendy-sheet-overlay=""
                aria-hidden="true"
                className="pointer-events-auto absolute inset-0 bg-background/60"
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  store.closeTop("outside");
                }}
              />
            )}
          </div>,
          settings.portalContainer ?? document.body,
        )}
      {managed.map((entry) => (
        <ManagedSheet key={entry.id} entry={entry} />
      ))}
    </SheetStackContext.Provider>
  );
}
const ManagedSheet = memo(function ManagedSheet({ entry }: { entry: ManagedSheetOptions }) {
  return (
    <SheetRoot
      id={entry.id}
      defaultOpen
      defaultPinned={entry.initialPinned}
      side={entry.side}
      width={entry.width}
      pinnable={entry.pinnable}
    >
      <ManagedContent render={entry.render} />
    </SheetRoot>
  );
});
const ManagedContent = memo(function ManagedContent({ render }: { render: () => ReactNode }) {
  return render();
});
/** Open persistent instances from events. Render functions run beneath the provider. */
export function useSheets(): SheetController {
  const stack = useContext(SheetStackContext);
  if (!stack) throw new Error("useSheets requires a SheetProvider.");
  return stack.store;
}
