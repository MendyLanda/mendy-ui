// Multiple independent providers may overlap. Closing one must not unlock another's page.
const locks = new WeakMap<Document, { count: number; overflow: string }>();
export function lockSheetScroll(document: Document) {
  const existing = locks.get(document);
  const lock = existing ?? { count: 0, overflow: document.body.style.overflow };
  lock.count += 1;
  locks.set(document, lock);
  document.body.style.overflow = "hidden";
  return () => {
    lock.count -= 1;
    if (lock.count) return;
    document.body.style.overflow = lock.overflow;
    locks.delete(document);
  };
}
