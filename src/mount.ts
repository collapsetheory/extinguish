import { untracked } from "@preact/signals-core";

type MountCallback = () => void | (() => void);
type CleanupCallback = () => void;

export type MountRuntime = {
  locked: boolean;
  cleanups: CleanupCallback[];
};

let currentRuntime: MountRuntime | undefined;

export function createMountRuntime(): MountRuntime {
  return {
    locked: false,
    cleanups: [],
  };
}

export function mount(callback: MountCallback) {
  const runtime = currentRuntime;
  if (!runtime) {
    throw new Error("mount can only be called inside enhance() or virtual().");
  }
  if (runtime.locked) return;
  const cleanup = untracked(callback);
  if (typeof cleanup === "function") {
    runtime.cleanups.push(cleanup);
  }
}

export function withMountRuntime<T>(
  runtime: MountRuntime,
  callback: () => T,
): T {
  const previousRuntime = currentRuntime;
  currentRuntime = runtime;
  try {
    return callback();
  } finally {
    currentRuntime = previousRuntime;
    runtime.locked = true;
  }
}

export function cleanupMountRuntime(runtime: MountRuntime) {
  for (const callback of runtime.cleanups) {
    callback();
  }
  runtime.cleanups = [];
}
