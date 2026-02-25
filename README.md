# extinguish

Signal-powered utilities for Lit and browser-first apps.

`extinguish` provides small primitives for async resources, route
matching/navigation, lazy renderers, transition scheduling, reactive DOM
enhancement, and error boundaries. It is framework-light: use it with `lit-html`
and `@preact/signals-core` directly.

## Documentation

- [Documentation Index](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api-reference.md)
- [Recipes](./docs/recipes.md)

## Install

### JSR (Deno)

```ts
import { matchPath, resource } from "jsr:@collapse-theory/extinguish";
```

### npm (Node/bundlers)

```bash
npm install extinguish
```

```ts
import { matchPath, resource } from "extinguish";
```

## Exports

- `boundary(options)`
- `enhance(className, fn)`
- `lazy(loader, options?)`
- `resource(loader, options?)`
- `defineRoute(name, pattern, meta?)`
- `setRoutes(definitions)`
- `matchPath(path, definitions)`
- `pathname` (signal)
- `currentRoute` (computed signal)
- `navigate(to, options?)`
- `startRouter(options?)`
- `pending` (signal)
- `transition(callback, timeoutMs?)`
- `virtual(renderer)`

## Quick examples

### Resource

```ts
import { resource } from "extinguish";

const userResource = resource(async () => {
  const response = await fetch("/api/me");
  return response.json();
});

await userResource.run();
console.log(userResource.value.value);
```

### Route matching

```ts
import { defineRoute, matchPath } from "extinguish";

const routes = [
  defineRoute("home", "/"),
  defineRoute("post", "/posts/:id"),
];

const match = matchPath("/posts/42", routes);
console.log(match?.params.id); // "42"
```

### Error boundary helper

```ts
import { boundary } from "extinguish";

const safeRender = boundary({
  component: () => riskyRender(),
  error: (err) => `Failed: ${String(err)}`,
});
```

## Runtime support

- Deno 2+
- Node 18+ (ESM/CJS outputs published via npm)
- Modern browsers (for modules that use `window`/`document`)

## Development

```bash
deno task check
deno task lint
deno task test
npm run build
```

## License

MIT
