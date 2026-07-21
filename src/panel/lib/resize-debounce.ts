export const RESIZE_DEBOUNCE_MS = 120;

interface TimerAdapter {
  schedule(callback: () => void, delay: number): number;
  clear(id: number): void;
}

interface ResizeDebouncer<T> {
  push(value: T): void;
  cancel(): void;
}

const defaultTimers: TimerAdapter = {
  schedule: (callback, delay) => globalThis.setTimeout(callback, delay),
  clear: (id) => globalThis.clearTimeout(id),
};

/** 連続したリサイズ値から最後の値だけを120ms後に通知する。 */
export function createResizeDebouncer<T>(
  deliver: (value: T) => void,
  timers: TimerAdapter = defaultTimers,
): ResizeDebouncer<T> {
  let pendingId: number | undefined;
  let generation = 0;

  return {
    push(value): void {
      generation += 1;
      const scheduledGeneration = generation;
      if (pendingId !== undefined) timers.clear(pendingId);
      pendingId = timers.schedule(() => {
        if (scheduledGeneration !== generation) return;
        pendingId = undefined;
        deliver(value);
      }, RESIZE_DEBOUNCE_MS);
    },
    cancel(): void {
      generation += 1;
      if (pendingId === undefined) return;
      timers.clear(pendingId);
      pendingId = undefined;
    },
  };
}
