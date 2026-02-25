# Recipes

## 1) Route-aware rendering with `currentRoute`

```ts
import { effect } from "@preact/signals-core";
import { currentRoute, defineRoute, setRoutes, startRouter } from "extinguish";

setRoutes([
  defineRoute("home", "/"),
  defineRoute("post", "/posts/:id"),
]);

const stopRouter = startRouter();

const stopEffect = effect(() => {
  const route = currentRoute.value;
  if (!route) {
    console.log("404");
    return;
  }

  if (route.name === "post") {
    console.log("Post id:", route.params.id);
  }
});

// Cleanup when app unmounts:
// stopEffect();
// stopRouter();
```

## 2) Last-write-wins fetches with `resource`

```ts
import { resource } from "extinguish";

const search = resource(async () => {
  const q = new URLSearchParams(location.search).get("q") ?? "";
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  return res.json();
});

// If called rapidly, only latest run updates value/error.
await Promise.all([search.run(), search.run(), search.run()]);
```

## 3) Safe fallback for async rendering with `boundary`

```ts
import { boundary } from "extinguish";

const renderUser = boundary({
  component: async () => {
    const res = await fetch("/api/user");
    if (!res.ok) throw new Error("User fetch failed");
    return await res.text();
  },
  error: (err) => `Could not load user: ${String(err)}`,
  onError: (err) => console.error("Render error", err),
});
```

## 4) Progressive renderer with `lazy`

```ts
import { lazy } from "extinguish";

const UserCard = lazy(
  () => import("./user-card.ts"),
  { loading: "Loading user card..." },
);

// First call returns loading fallback, then actual renderer output.
const result = UserCard({ id: "42" });
```

`./user-card.ts` should export a default renderer:

```ts
export default function userCard(props: { id: string }) {
  return `User ${props.id}`;
}
```

## 5) Local reactive enhancement with `enhance`

```ts
import { signal } from "@preact/signals-core";
import { html } from "lit-html";
import { enhance } from "extinguish";

const count = signal(0);

const dispose = enhance("counter", () =>
  html`
    <button @click="${() => count.value--}">-</button>
    <span>${count.value}</span>
    <button @click="${() => count.value++}">+</button>
  `);

// Later: dispose();
```

HTML:

```html
<div class="counter"></div>
<div class="counter"></div>
```

## 6) Batched UI work with `transition`

```ts
import { pending, transition } from "extinguish";

transition(() => {
  // multiple signal writes can happen here
  // and are batched together
});

if (pending.value) {
  console.log("transition in progress");
}
```

## 7) `virtual` directive inside Lit templates

```ts
import { html, render } from "lit-html";
import { signal } from "@preact/signals-core";
import { virtual } from "extinguish";

const state = signal({ name: "Ada" });

const userView = virtual((props: { title: string }) => {
  return html`
    <h2>${props.title}</h2><p>${state.value.name}</p>
  `;
});

render(
  html`
    <section>${userView({ title: "Profile" })}</section>
  `,
  document.body,
);
```

Use `virtual` only in child expressions, not attributes/properties/events.
