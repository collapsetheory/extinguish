type BoundaryRenderer = () => unknown | Promise<unknown> | void;
type BoundaryErrorRenderer = (error: unknown) => unknown | void;

type BoundaryOptions = {
  component: BoundaryRenderer;
  error: unknown | BoundaryErrorRenderer;
  onError?: (error: unknown) => void;
};

/**
 * Wraps a renderer so sync throws and async rejections are mapped to a
 * fallback value.
 *
 * The returned function preserves sync/async behavior of `component`.
 */
export function boundary(options: BoundaryOptions): BoundaryRenderer {
  const resolve = (error: unknown) => {
    options.onError?.(error);
    if (typeof options.error === "function") {
      return (options.error as BoundaryErrorRenderer)(error);
    }
    return options.error;
  };

  return () => {
    try {
      const result = options.component();
      if (result instanceof Promise) {
        return result.catch((error) => resolve(error));
      }
      return result;
    } catch (error) {
      return resolve(error);
    }
  };
}
