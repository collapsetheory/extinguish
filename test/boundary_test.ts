import { boundary } from "../src/boundary.ts";

function assertEquals<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed: expected ${String(expected)}, got ${String(actual)}`,
    );
  }
}

async function assertRejects(fn: () => Promise<unknown>) {
  let rejected = false;
  try {
    await fn();
  } catch {
    rejected = true;
  }
  if (!rejected) {
    throw new Error("Assertion failed: expected promise rejection");
  }
}

Deno.test("boundary maps sync throw to fallback", () => {
  const run = boundary({
    component: () => {
      throw new Error("boom");
    },
    error: "fallback",
  });

  assertEquals(run(), "fallback");
});

Deno.test("boundary maps async rejection to fallback", async () => {
  const run = boundary({
    component: () => Promise.reject(new Error("boom")),
    error: "fallback",
  });

  assertEquals(await run(), "fallback");
});

Deno.test("boundary passes through successful async result", async () => {
  const run = boundary({
    component: () => Promise.resolve("ok"),
    error: "fallback",
  });

  assertEquals(await run(), "ok");
});

Deno.test("boundary rethrows from error renderer when needed", async () => {
  const run = boundary({
    component: () => Promise.reject(new Error("boom")),
    error: (err) => {
      throw err;
    },
  });

  await assertRejects(() => run() as Promise<unknown>);
});
