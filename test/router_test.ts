import { defineRoute, matchPath } from "../src/router.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

Deno.test("matchPath matches static and dynamic routes", () => {
  const routes = [
    defineRoute("home", "/"),
    defineRoute("post", "/posts/:id"),
  ];

  assertEquals(matchPath("/", routes)?.name, "home");
  assertEquals(matchPath("/posts/42", routes)?.params.id, "42");
  assertEquals(matchPath("/missing", routes), null);
});
