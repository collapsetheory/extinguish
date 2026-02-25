# API Reference

## `boundary(options)`

Wraps a sync or async renderer/function and converts thrown errors/rejections
into a fallback value.

### Signature

```ts
function boundary(options: {
  component: () => unknown | Promise<unknown> | void;
  error: unknown | ((error: unknown) => unknown | void);
  onError?: (error: unknown) => void;
}): () => unknown | Promise<unknown> | void;
```

### Behavior

- Calls `options.component()` when the returned function is invoked.
- If the component throws (sync) or rejects (async), returns `options.error`.
- If `options.error` is a function, it is called with the caught error.
- Calls `onError` before resolving fallback.

### Example

```ts
const guarded = boundary({
  component: () => riskyOperation(),
  error: (err) => ({ ok: false, message: String(err) }),
});
```

## `resource(loader, options?)`

Creates request state managed by signals with stale-response protection.

### Signature

```ts
type Resource<T> = {
  value: Signal<T | undefined>;
  pending: Signal<boolean>;
  error: Signal<unknown>;
  run: () => Promise<T | undefined>;
  reload: () => Promise<T | undefined>;
};

function resource<T>(
  loader: () => Promise<T>,
  options?: { initialValue?: T },
): Resource<T>;
```

### Behavior

- `run()` increments an internal request id.
- Only the latest request can update `value`, `error`, and `pending`.
- Older in-flight requests are ignored after a newer run starts.
- `reload()` is an alias of `run()`.

### Example

```ts
const posts = resource(async () => {
  const res = await fetch("/api/posts");
  return res.json() as Promise<Array<{ id: number; title: string }>>;
});

await posts.run();
```

## Router API

### Types

```ts
type RouteDefinition<TMeta = unknown> = {
  name: string;
  pattern: string;
  meta?: TMeta;
};

type RouteMatch<TMeta = unknown> = {
  name: string;
  pattern: string;
  params: Record<string, string>;
  meta?: TMeta;
};
```

### `defineRoute(name, pattern, meta?)`

Creates a route definition object.

### `setRoutes(definitions)`

Sets the global route list used by `currentRoute`.

### `matchPath(path, definitions)`

Matches a path against route definitions.

- Supports dynamic params (`/posts/:id`).
- Requires the same segment count.
- Decodes param values with `decodeURIComponent`.

### `pathname`

`Signal<string>` with current path. In browser mode, initialized from
`location.pathname`; otherwise defaults to `/`.

### `currentRoute`

`ReadonlySignal<RouteMatch | null>` computed from `pathname` + route list set
via `setRoutes`.

### `navigate(to, options?)`

Programmatic navigation.

```ts
function navigate(
  to: string,
  options?: { replace?: boolean; state?: unknown },
): void;
```

- Uses history `pushState` by default.
- Uses `replaceState` when `options.replace` is true.
- No-op in non-browser environments.

### `startRouter(options?)`

Starts popstate and delegated link interception.

```ts
function startRouter(options?: {
  linkSelector?: string;
  interceptLinks?: boolean;
}): () => void;
```

- Default selector: `a[data-nav]`
- Ignores modified/middle clicks, downloads, external links, hash-only links.
- Returns a cleanup function that removes listeners.
- Reuses active listeners if already started.

## `lazy(loader, options?)`

Creates a lazily loaded renderer compatible with the `virtual` pattern.

### Signature

```ts
function lazy<T extends Record<string, unknown>>(
  loader: () => Promise<{ default: (props: T) => unknown | void }>,
  options?: { loading?: unknown },
): (props: T) => unknown | void;
```

### Behavior

- Loads once on first call.
- While loading, returns `options.loading`.
- Throws cached load error on subsequent calls.

## `virtual(renderer)`

Creates a Lit directive that runs `renderer(props)` inside a signals effect and
updates directive value reactively.

### Signature

```ts
function virtual<T extends Record<string, unknown>>(
  renderer: (props: T) => unknown | void,
): (props: T) => unknown;
```

### Constraints

- Only valid in child-part expressions.
- Throws if used in attribute/property/event part positions.
- Cleans up effect on disconnect and restarts on reconnect.

## `enhance(className, fn)`

Mounts a signal effect to elements by `class`, with auto-mount/unmount via
`MutationObserver`.

### Signature

```ts
function enhance(
  className: string,
  fn: (this: HTMLElement, element: HTMLElement) => unknown | void,
): () => void;
```

### Behavior

- Immediately attempts to mount on all elements with that class.
- If `fn` returns a template/result, it is rendered with `lit-html`.
- Tracks added/removed nodes with matching classes and mounts/unmounts
  automatically.
- Returns disposer that unregisters and unmounts currently matched elements.

## `transition(callback, timeoutMs?)` and `pending`

Schedules a batched update for idle time and exposes global pending state.

### Signature

```ts
const pending: Signal<boolean>;

function transition(
  callback: () => void,
  timeoutMs?: number,
): void;
```

### Behavior

- Increments internal pending counter when called.
- Runs callback in `batch(...)`.
- Uses `requestIdleCallback` when available; falls back to `setTimeout(..., 0)`.
- Decrements pending counter when callback finishes.
- `pending.value` is true when one or more transitions are outstanding.
