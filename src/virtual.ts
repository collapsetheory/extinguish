import { effect } from "@preact/signals-core";
import { nothing } from "lit-html";
import { AsyncDirective } from "lit-html/async-directive.js";
import { directive, PartType } from "lit-html/directive.js";
import {
  cleanupMountRuntime,
  createMountRuntime,
  withMountRuntime,
} from "./mount.ts";

export type Attributes = Record<string, unknown>;
type VirtualRenderer<T extends Attributes> = (props: T) => unknown | void;
export type VirtualDirective<T extends Attributes> = (props: T) => unknown;

export function virtual<T extends Attributes>(
  renderer: VirtualRenderer<T>,
): VirtualDirective<T> {
  return directive(
    class VirtualDirective extends AsyncDirective {
      #dispose?: () => void;
      #props?: T;
      #runtime = createMountRuntime();

      constructor(partInfo: ConstructorParameters<typeof AsyncDirective>[0]) {
        super(partInfo);
        if (partInfo.type !== PartType.CHILD) {
          throw new Error("virtual() can only be used in child expressions.");
        }
      }

      render(props: T) {
        this.#props = props;
        this.#restart();
        return withMountRuntime(
          this.#runtime,
          () => renderer(this.#props as T),
        );
      }

      override disconnected() {
        this.#dispose?.();
        this.#dispose = undefined;
        cleanupMountRuntime(this.#runtime);
      }

      override reconnected() {
        this.#runtime = createMountRuntime();
        this.#restart();
      }

      #restart() {
        if (!this.#props) return;
        this.#dispose?.();
        this.#dispose = effect(() => {
          const result = withMountRuntime(
            this.#runtime,
            () => renderer(this.#props as T),
          );
          this.setValue(result === undefined ? nothing : result);
        });
      }
    },
  );
}
