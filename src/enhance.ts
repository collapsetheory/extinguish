import { effect, untracked } from "@preact/signals-core";
import { render } from "lit-html";

type MountCallback = () => void | (() => void);
type UnmountCallback = () => void;

export type EnhanceContext<T extends HTMLElement = HTMLElement> = {
  element: T;
  mount: (callback: MountCallback) => void;
  unmount: (callback: UnmountCallback) => void;
};

type EffectCallback<T extends HTMLElement = HTMLElement> = (
  context: EnhanceContext<T>,
) => unknown | void;

type MountedInstance = {
  dispose: () => void;
};

const registry = new Map<string, EffectCallback<HTMLElement>>();
const mounted = new WeakMap<HTMLElement, MountedInstance>();
let observer: MutationObserver | undefined;

function mount<T extends HTMLElement>(el: T | null, fn: EffectCallback<T>) {
  if (!el) return;
  const existing = mounted.get(el);
  if (existing) {
    existing.dispose();
  }

  const unmountCallbacks: UnmountCallback[] = [];
  let hooksLocked = false;

  const context: EnhanceContext<T> = {
    element: el,
    mount: (callback) => {
      if (hooksLocked) return;
      const cleanup = untracked(callback);
      if (typeof cleanup === "function") {
        unmountCallbacks.push(cleanup);
      }
    },
    unmount: (callback) => {
      if (hooksLocked) return;
      unmountCallbacks.push(callback);
    },
  };

  const instance: MountedInstance = {
    dispose: () => {},
  };
  const dispose = effect(() => {
    const result = fn(context);
    hooksLocked = true;

    if (result !== undefined) {
      render(result, el);
    }
  });

  instance.dispose = () => {
    dispose();
    for (const callback of unmountCallbacks) {
      callback();
    }
  };
  mounted.set(el, instance);
}

function unmount(el: HTMLElement | null) {
  if (!el) return;
  const instance = mounted.get(el);
  if (!instance) return;
  instance.dispose();
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
            mount(el, fn);
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
 * `fn` receives a context object:
 * - `element`: the matched DOM element.
 * - `mount(callback)`: run setup once for this element (outside tracking);
 *   if the callback returns a disposer, it runs on unmount.
 * - `unmount(callback)`: register teardown to run on unmount.
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
  forEachByClassName(className, (el) => mount(el as T, fn));
  ensureObserver();

  return () => {
    registry.delete(className);
    forEachByClassName(className, (el) => unmount(el));
  };
}
