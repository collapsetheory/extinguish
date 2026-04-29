import { type Signal, signal } from "@preact/signals-core";

type LoaderArgs = readonly unknown[];
type Loader<T, Args extends LoaderArgs = []> = (...args: Args) => Promise<T>;
type CreateResourceOptions<T> = {
  initialValue?: T;
};

export type Resource<T, Args extends LoaderArgs = []> = {
  data: Signal<T | undefined>;
  pending: Signal<boolean>;
  error: Signal<unknown>;
  run: (...args: Args) => Promise<T | undefined>;
  reload: (...args: Args) => Promise<T | undefined>;
};

export function resource<T, Args extends LoaderArgs = []>(
  loader: Loader<T, Args>,
  { initialValue }: CreateResourceOptions<T> = {},
): Resource<T, Args> {
  const data = signal<T | undefined>(initialValue);
  const pending = signal(false);
  const error = signal<unknown>(null);

  let requestId = 0;

  const run = async (...args: Args) => {
    const currentId = ++requestId;
    pending.value = true;
    error.value = null;

    try {
      const result = await loader(...args);
      if (currentId === requestId) {
        data.value = result;
        return result;
      }
    } catch (caught) {
      if (currentId === requestId) {
        error.value = caught;
      }
    } finally {
      if (currentId === requestId) {
        pending.value = false;
      }
    }
    return undefined;
  };

  return { data, pending, error, run, reload: run };
}
