import {
  computed,
  type ReadonlySignal,
  type Signal,
  signal,
} from "@preact/signals-core";

/**
 * Route entry used by the matcher and runtime router.
 */
export type RouteDefinition<TMeta = unknown> = {
  name: string;
  pattern: string;
  meta?: TMeta;
};

/**
 * A successful result of matching a pathname against route definitions.
 */
export type RouteMatch<TMeta = unknown> = {
  name: string;
  pattern: string;
  params: Record<string, string>;
  meta?: TMeta;
};

type StartOptions = {
  linkSelector?: string;
  interceptLinks?: boolean;
};

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

const routes: Signal<RouteDefinition[]> = signal<RouteDefinition[]>([]);
/**
 * Current browser pathname as a signal.
 */
export const pathname: Signal<string> = signal(
  getBrowserWindow()?.location.pathname ?? "/",
);

let started = false;
let stopRouter: (() => void) | undefined;

function splitPath(value: string) {
  return value.split("/").filter(Boolean);
}

function getBrowserWindow(): Window | null {
  if (
    typeof globalThis.document === "undefined" ||
    typeof globalThis.location === "undefined" ||
    typeof globalThis.history === "undefined"
  ) {
    return null;
  }
  return globalThis as unknown as Window;
}

export function defineRoute<TMeta = unknown>(
  name: string,
  pattern: string,
  meta?: TMeta,
): RouteDefinition<TMeta> {
  return { name, pattern, meta };
}

/**
 * Replaces the route table used by {@link currentRoute}.
 */
export function setRoutes(definitions: RouteDefinition[]): void {
  routes.value = definitions;
}

/**
 * Matches a path against route definitions.
 *
 * Supports parameter segments like `/posts/:id`.
 */
export function matchPath(
  path: string,
  definitions: RouteDefinition[],
): RouteMatch | null {
  const pathSegments = splitPath(path);

  for (const definition of definitions) {
    const patternSegments = splitPath(definition.pattern);
    if (patternSegments.length !== pathSegments.length) continue;

    const params: Record<string, string> = {};
    let matches = true;

    for (let i = 0; i < patternSegments.length; i += 1) {
      const patternSegment = patternSegments[i];
      const pathSegment = pathSegments[i];

      if (patternSegment.startsWith(":")) {
        params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
        continue;
      }

      if (patternSegment !== pathSegment) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return {
        name: definition.name,
        pattern: definition.pattern,
        params,
        meta: definition.meta,
      };
    }
  }

  return null;
}

/**
 * Computed route match for the current `pathname`.
 */
export const currentRoute: ReadonlySignal<RouteMatch | null> = computed(() =>
  matchPath(pathname.value, routes.value)
);

function updatePathFromLocation(scope: Window): void {
  pathname.value = scope.location.pathname;
}

function canInterceptClick(
  scope: Window,
  event: MouseEvent,
  selector: string,
): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const anchor = target.closest(selector);
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;

  const nextUrl = new URL(href, scope.location.href);
  if (nextUrl.origin !== scope.location.origin) return false;

  navigate(nextUrl.pathname, { state: scope.history.state });
  event.preventDefault();
  return true;
}

/**
 * Navigates to a new path using history state APIs.
 *
 * No-op when no browser globals are available.
 */
export function navigate(to: string, options: NavigateOptions = {}): void {
  const scope = getBrowserWindow();
  if (!scope) return;

  const nextUrl = new URL(to, scope.location.href);
  const nextPath = nextUrl.pathname;
  const method = options.replace ? "replaceState" : "pushState";
  scope.history[method](options.state ?? null, "", nextPath);
  pathname.value = nextPath;
}

/**
 * Starts browser router listeners and returns a cleanup disposer.
 *
 * When already started, returns the existing disposer.
 */
export function startRouter(options: StartOptions = {}): () => void {
  const scope = getBrowserWindow();
  if (!scope) return () => {};
  if (started && stopRouter) return stopRouter;

  const selector = options.linkSelector ?? "a[data-nav]";
  const interceptLinks = options.interceptLinks ?? true;
  const onPopState = () => updatePathFromLocation(scope);
  const onClick = (event: MouseEvent) => {
    if (!interceptLinks) return;
    canInterceptClick(scope, event, selector);
  };

  scope.addEventListener("popstate", onPopState);
  document.addEventListener("click", onClick);
  updatePathFromLocation(scope);

  started = true;
  stopRouter = () => {
    scope.removeEventListener("popstate", onPopState);
    document.removeEventListener("click", onClick);
    started = false;
    stopRouter = undefined;
  };

  return stopRouter;
}
