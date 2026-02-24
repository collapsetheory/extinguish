# Getting Started

## Installation

### Deno / JSR

```ts
import {
  defineRoute,
  matchPath,
  resource,
} from "jsr:@collapse-theory/extinguish";
```

### npm

```bash
npm install extinguish
```

```ts
import { defineRoute, matchPath, resource } from "extinguish";
```

## First example: async state with `resource`

```ts
import { resource } from "extinguish";

type User = { id: string; name: string };

const user = resource<User>(async () => {
  const response = await fetch("/api/user");
  if (!response.ok) throw new Error("Failed to load user");
  return response.json();
});

await user.run();

if (user.error.value) {
  console.error(user.error.value);
} else {
  console.log(user.value.value);
}
```

## First example: route matching

```ts
import { defineRoute, matchPath } from "extinguish";

const routes = [
  defineRoute("home", "/"),
  defineRoute("post", "/posts/:id"),
];

const route = matchPath("/posts/123", routes);
console.log(route?.name); // post
console.log(route?.params.id); // 123
```

## First example: router lifecycle in browser

```ts
import { currentRoute, defineRoute, setRoutes, startRouter } from "extinguish";

setRoutes([
  defineRoute("home", "/"),
  defineRoute("about", "/about"),
]);

const stop = startRouter({ linkSelector: "a[data-nav]" });

// Read from currentRoute in your reactive/UI layer.
console.log(currentRoute.value?.name);

// Later, when cleaning up app shell:
stop();
```

## Import surface

All public exports are available from the package root:

```ts
import {
  boundary,
  currentRoute,
  defineRoute,
  enhance,
  lazy,
  matchPath,
  navigate,
  pathname,
  pending,
  resource,
  setRoutes,
  startRouter,
  transition,
  virtual,
} from "extinguish";
```

For detailed contracts and caveats, see the [API Reference](./api-reference.md).
