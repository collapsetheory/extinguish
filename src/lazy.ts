import { signal } from "@preact/signals-core";

type Attributes = Record<string, unknown>;
type VirtualRenderer<T extends Attributes> = (props: T) => unknown | void;
type LazyModule<T extends Attributes> = { default: VirtualRenderer<T> };
type LazyLoader<T extends Attributes> = () => Promise<LazyModule<T>>;

type LazyOptions = {
  loading?: unknown;
};

/**
 * Creates a renderer that lazy-loads its implementation module on first use.
 *
 * While loading, it returns `options.loading`. If load fails, subsequent calls
 * throw the cached error.
 */
export function lazy<T extends Attributes>(
  loader: LazyLoader<T>,
  options: LazyOptions = {},
): VirtualRenderer<T> {
  const component = signal<VirtualRenderer<T> | null>(null);
  const loading = signal(false);
  const loadError = signal<unknown>(null);

  const load = async () => {
    if (component.value || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      const module = await loader();
      component.value = module.default;
    } catch (error) {
      loadError.value = error;
    } finally {
      loading.value = false;
    }
  };

  return (props: T) => {
    if (loadError.value !== null) {
      throw loadError.value;
    }

    const renderer = component.value;
    if (renderer) {
      return renderer(props);
    }

    void load();
    return options.loading;
  };
}
