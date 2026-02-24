# extinguish documentation

This documentation covers the full public API of `extinguish` and practical
usage patterns for browser apps using signals and `lit-html`.

## Docs map

- [Getting Started](./getting-started.md)
- [API Reference](./api-reference.md)
- [Recipes](./recipes.md)

## Package targets

- JSR: `jsr:@collapse-theory/extinguish`
- npm: `extinguish`

## Runtime notes

Some modules are browser-only because they rely on DOM globals (`document`,
`Element`, `MutationObserver`, `history`, `location`):

- `enhance`
- `virtual`
- `startRouter` / `navigate`
- `transition` (scheduling behavior)

Pure utility APIs like `matchPath`, `resource`, and `boundary` can also be used
in non-DOM contexts.
