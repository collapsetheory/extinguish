import { effect, untracked } from "@preact/signals-core";
import { render } from "lit-html";

type MountCallback = () => void | (() => void);
type CleanupCallback = () => void;

type HookRuntime = {
  locked: boolean;
  cleanups: CleanupCallback[];
};

type EffectCallback<T extends HTMLElement = HTMLElement> = (
  element: T,
) => unknown | void;

const registry = new Map<string, EffectCallback<HTMLElement>>();
const mounted = new WeakMap<HTMLElement, () => void>();
let currentHookRuntime: HookRuntime | undefined;
let observer: MutationObserver | undefined;

export function mount(callback: MountCallback) {
  const runtime = currentHookRuntime;
  if (!runtime) {
    throw new Error("mount can only be called inside enhance().");
  }
  if (runtime.locked) return;
  const cleanup = untracked(callback);
  if (typeof cleanup === "function") {
    runtime.cleanups.push(cleanup);
  }
}

function mountElement<T extends HTMLElement>(el: T | null, fn: EffectCallback<T>) {
  if (!el) return;
  mounted.get(el)?.();

  const runtime: HookRuntime = {
    locked: false,
    cleanups: [],
  };

  const stop = effect(() => {
    const previousRuntime = currentHookRuntime;
    currentHookRuntime = runtime;
    let result: unknown | void;
    try {
      result = fn(el);
    } finally {
      currentHookRuntime = previousRuntime;
      runtime.locked = true;
    }

    if (result !== undefined) {
      render(result, el);
    }
  });

  mounted.set(el, () => {
    stop();
    for (const callback of runtime.cleanups) {
      callback();
    }
  });
}

function unmount(el: HTMLElement | null) {
  if (!el) return;
  const dispose = mounted.get(el);
  if (!dispose) return;
  dispose();
  mounted.delete(el);
  render(null, el);
}

function forEachByClassName(
  className: string,
  callback: (el: HTMLElement) => void,
) {
  const nodes = document.getElementsByClassName(className);
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    callback(node);
  }
}

function walk(node: Node, onElement: (el: HTMLElement) => void) {
  if (!(node instanceof Element)) return;

  if (node instanceof HTMLElement) {
    onElement(node);
  }

  node.querySelectorAll<HTMLElement>("*").forEach(onElement);
}

function ensureObserver() {
  if (observer) return;

  observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node: Node) =>
        walk(node, (el) => {
          registry.forEach((fn, className) => {
            if (!el.classList.contains(className)) return;
            mountElement(el, fn);
          });
        })
      );
      record.removedNodes.forEach((node: Node) => walk(node, unmount));
    });
  });

  observer.observe(document, { childList: true, subtree: true });
}

/**
 * Attaches a reactive effect to all elements with a class and keeps mounts in
 * sync as the DOM changes.
 *
 * `fn` reruns whenever any signal read inside it changes.
 * `fn` receives the matched DOM element as its first argument.
 *
 * Use `mount(callback)` inside `fn` to run setup once per element outside
 * reactive tracking. If `callback` returns a function, it runs on unmount.
 *
 * If `fn` returns a non-`undefined` value, it is rendered into the element via
 * `lit-html`.
 *
 * Returns a disposer that unregisters and unmounts all currently matched
 * elements.
 */
export function enhance<T extends HTMLElement = HTMLElement>(
  className: string,
  fn: EffectCallback<T>,
): () => void {
  registry.set(className, fn as EffectCallback<HTMLElement>);
  forEachByClassName(className, (el) => mountElement(el as T, fn));
  ensureObserver();

  return () => {
    registry.delete(className);
    forEachByClassName(className, (el) => unmount(el));
  };
}
