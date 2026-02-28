import { type Signal, signal } from "@preact/signals-core";

type Loader<T> = () => Promise<T>;

type CreateResourceOptions<T> = {
  initialValue?: T;
};

/**
 * Reactive async resource state.
 *
 * `run()` and `reload()` execute the loader. Signals expose latest value,
 * pending status, and error.
 */
export type Resource<T> = {
  data: Signal<T | undefined>;
  pending: Signal<boolean>;
  error: Signal<unknown>;
  run: () => Promise<T | undefined>;
  reload: () => Promise<T | undefined>;
};

/**
 * Creates a resource with last-write-wins semantics.
 *
 * If multiple runs overlap, only the most recent invocation is allowed to
 * update state.
 */
export function resource<T>(
  loader: Loader<T>,
  options: CreateResourceOptions<T> = {},
): Resource<T> {
  const data = signal<T | undefined>(options.initialValue);
  const pending = signal(false);
  const error = signal<unknown>(null);

  let requestId = 0;

  const run = async () => {
    requestId++;
    const currentId = requestId;
    pending.value = true;
    error.value = null;

    try {
      const result = await loader();
      if (currentId !== requestId) return undefined;
      data.value = result;
      return result;
    } catch (caught) {
      if (currentId !== requestId) return undefined;
      error.value = caught;
      return undefined;
    } finally {
      if (currentId === requestId) pending.value = false;
    }
  };

  const reload = () => run();

  return {
    data,
    pending,
    error,
    run,
    reload,
  };
}
