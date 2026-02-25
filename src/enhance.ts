import { effect } from "@preact/signals-core";
import { render } from "lit-html";

type EffectCallback = (
  this: HTMLElement,
  element: HTMLElement,
) => unknown | void;

const registry = new Map<string, EffectCallback>();
const mounted = new WeakMap<HTMLElement, () => void>();
let observer: MutationObserver | undefined;

function mount(el: HTMLElement | null, fn: EffectCallback) {
  if (!el) return;
  const existing = mounted.get(el);
  if (existing) {
    existing();
  }

  const dispose = effect(() => {
    const result = fn.call(el, el);
    if (result !== undefined) {
      render(result, el);
    }
  });

  mounted.set(el, dispose);
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
 * `fn` executes with `this === el` and also receives `el` as first argument.
 *
 * If `fn` returns a non-`undefined` value, it is rendered into the element via
 * `lit-html`.
 *
 * Returns a disposer that unregisters and unmounts all currently matched
 * elements.
 */
export function enhance(className: string, fn: EffectCallback): () => void {
  registry.set(className, fn);
  forEachByClassName(className, (el) => mount(el, fn));
  ensureObserver();

  return () => {
    registry.delete(className);
    forEachByClassName(className, (el) => unmount(el));
  };
}
