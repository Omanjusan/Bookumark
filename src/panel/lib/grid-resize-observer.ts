import { calculateGridCells } from "./grid-measurement.js";
import { createResizeDebouncer } from "./resize-debounce.js";

interface ResizeEntryLike {
  readonly target: Element;
  readonly contentRect: { readonly width: number; readonly height: number };
}

interface ResizeObserverLike {
  observe(target: Element): void;
  disconnect(): void;
}

interface TimerAdapter {
  schedule(callback: () => void, delay: number): number;
  clear(id: number): void;
}

interface GridResizeObserverOptions {
  readonly createObserver?: (
    callback: (entries: readonly ResizeEntryLike[]) => void,
  ) => ResizeObserverLike;
  readonly timers?: TimerAdapter;
}

interface GridResizeConnection {
  disconnect(): void;
}

const defaultObserverFactory = (
  callback: (entries: readonly ResizeEntryLike[]) => void,
): ResizeObserverLike => new ResizeObserver((entries) => callback(entries));

/** グリッドの有効なcontent box変更を監視し、最後のセル数だけを通知する。 */
export function observeGridCells(
  target: Element,
  deliver: (cells: { columns: number; rows: number }) => void,
  options: GridResizeObserverOptions = {},
): GridResizeConnection {
  const debouncer = createResizeDebouncer(
    ({ width, height }: { width: number; height: number }) => {
      deliver(calculateGridCells({ width, height }));
    },
    options.timers,
  );
  const createObserver = options.createObserver ?? defaultObserverFactory;
  const observer = createObserver((entries) => {
    let latest: ResizeEntryLike | undefined;
    for (const entry of entries) {
      if (entry.target === target) latest = entry;
    }
    if (!latest || latest.contentRect.width <= 0 || latest.contentRect.height <= 0) return;
    debouncer.push({
      width: latest.contentRect.width,
      height: latest.contentRect.height,
    });
  });
  observer.observe(target);

  return {
    disconnect(): void {
      debouncer.cancel();
      observer.disconnect();
    },
  };
}
