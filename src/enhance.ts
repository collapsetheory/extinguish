import { effect } from "@preact/signals-core";
import { render } from "lit-html";
import {
  cleanupMountRuntime,
  createMountRuntime,
  withMountRuntime,
} from "./mount.ts";
export { mount } from "./mount.ts";

type EffectCallback<T extends HTMLElement = HTMLElement> = (
  element: T,
) => unknown | void;

const registry = new Map<string, EffectCallback<HTMLElement>>();
const mounted = new WeakMap<HTMLElement, () => void>();
let observer: MutationObserver | undefined;

function mountElement<T extends HTMLElement>(
  el: T | null,
  fn: EffectCallback<T>,
) {
  if (!el) return;
  mounted.get(el)?.();

  const runtime = createMountRuntime();

  const stop = effect(() => {
    const result = withMountRuntime(runtime, () => fn(el));

    if (result !== undefined) {
      render(result, el);
    }
  });

  mounted.set(el, () => {
    stop();
    cleanupMountRuntime(runtime);
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
