import { batch, type Signal, signal } from "@preact/signals-core";

type IdleLikeWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    timeoutMs?: number,
  ) => number;
};

export const pending: Signal<boolean> = signal(false);
let pendingCount = 0;

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
