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

function walk(node: Node, onElement: (el: HTMLElement) => void) {
  if (!(node instanceof Element)) return;

  if (node instanceof HTMLElement && node.id) {
    onElement(node);
  }

  node.querySelectorAll<HTMLElement>("[id]").forEach(onElement);
}

function ensureObserver() {
  if (observer) return;

  observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node: Node) =>
        walk(node, (el) => {
          if (!el.id) return;
          const fn = registry.get(el.id);
          if (!fn) return;
          mount(el, fn);
        })
      );
      record.removedNodes.forEach((node: Node) => walk(node, unmount));
    });
  });

  observer.observe(document, { childList: true, subtree: true });
}

/**
 * Attaches a reactive effect to an element id and keeps it mounted as the DOM
 * changes.
 *
 * `fn` reruns whenever any signal read inside it changes.
 * `fn` executes with `this === el` and also receives `el` as first argument.
 *
 * If `fn` returns a non-`undefined` value, it is rendered into the element via
 * `lit-html`.
 *
 * Returns a disposer that unregisters and unmounts the current element.
 */
export function enhance(key: string, fn: EffectCallback): () => void {
  registry.set(key, fn);
  mount(document.querySelector<HTMLElement>(`#${key}`), fn);
  ensureObserver();

  return () => {
    registry.delete(key);
    unmount(document.querySelector<HTMLElement>(`#${key}`));
  };
}
