import { batch, type Signal, signal } from "@preact/signals-core";

type IdleLikeWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    timeoutMs?: number,
  ) => number;
};

/**
 * Indicates whether any scheduled transitions are still in flight.
 */
export const pending: Signal<boolean> = signal(false);
let pendingCount = 0;

/**
 * Schedules a batched callback for idle time.
 *
 * Uses `requestIdleCallback` when available and falls back to `setTimeout`.
 * `pending` stays true while one or more transitions are outstanding.
 */
export function transition(
  callback: () => void,
  timeoutMs: number = 120,
): void {
  pendingCount++;
  pending.value = true;

  const run = () => {
    try {
      batch(callback);
    } finally {
      pendingCount--;
      pending.value = pendingCount > 0;
    }
  };

  const scope = globalThis as unknown as IdleLikeWindow;
  const rid = scope.requestIdleCallback;
  if (rid) {
    rid(run, timeoutMs);
    return;
  }

  globalThis.setTimeout(run, 0);
}
