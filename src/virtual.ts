import { effect } from "@preact/signals-core";
import { nothing } from "lit-html";
import { AsyncDirective } from "lit-html/async-directive.js";
import { directive, PartType } from "lit-html/directive.js";

export type Attributes = Record<string, unknown>;
type VirtualRenderer<T extends Attributes> = (props: T) => unknown | void;
/**
 * Lit child-part directive factory returned by {@link virtual}.
 */
export type VirtualDirective<T extends Attributes> = (props: T) => unknown;

/**
 * Creates a Lit directive that reruns a renderer whenever consumed signals
 * change.
 *
 * This directive can only be used in child expressions.
 */
export function virtual<T extends Attributes>(
  renderer: VirtualRenderer<T>,
): VirtualDirective<T> {
  return directive(
    class VirtualDirective extends AsyncDirective {
      #dispose?: () => void;
      #props?: T;

      constructor(partInfo: ConstructorParameters<typeof AsyncDirective>[0]) {
        super(partInfo);
        if (partInfo.type !== PartType.CHILD) {
          throw new Error("virtual() can only be used in child expressions.");
        }
      }

      render(props: T) {
        this.#props = props;
        this.#restart();
        return nothing;
      }

      override disconnected() {
        this.#dispose?.();
        this.#dispose = undefined;
      }

      override reconnected() {
        this.#restart();
      }

      #restart() {
        if (!this.#props) return;
        this.#dispose?.();
        this.#dispose = effect(() => {
          const result = renderer(this.#props as T);
          this.setValue(result === undefined ? nothing : result);
        });
      }
    },
  );
}
