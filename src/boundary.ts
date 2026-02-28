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
  const { component, error, onError } = options;
  const renderError: BoundaryErrorRenderer = typeof error === "function"
    ? error as BoundaryErrorRenderer
    : () => error;

  const resolve = (caught: unknown) => {
    onError?.(caught);
    return renderError(caught);
  };

  return () => {
    try {
      const result = component();
      if (result instanceof Promise) {
        return result.catch(resolve);
      }
      return result;
    } catch (caught) {
      return resolve(caught);
    }
  };
}
