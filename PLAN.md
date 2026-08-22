# Typwiki Development Plan

Typwiki is a static wiki builder: authored in Typst, typeset by the Typst
compiler, wrapped in a React server-rendered shell, and deployed as plain HTML
to any static host (including GitHub Pages).

## Current Status

Core features are complete and exercised by the test suite:

- [x] Backlinks, tags, outgoing links, related pages
- [x] Static HTML output (`public/p/<id>/index.html` + root homepage)
- [x] Live development server with SSE reload and diagnostics
- [x] Configurable page-backed homepage
- [x] React SSR shell (replaces string concatenation)
- [x] Tailwind token theme system with per-theme variable override layers
- [x] Client-side search against a static `search-index.json`
- [x] Light/dark/system color-scheme toggle with no-JS fallback
- [x] Typst pages free of generated-index dependencies (`typst --input`)

## Architecture

```
pages/*.typ  +  lib/typwiki.typ        content layer (Typst; never reads build output)
        │ typst CLI eval/compile, config injected via --input
        ▼
src/build/*                             build pipeline (Node/tsx)
   discovery → typst-adapter → graph → routing → render-site.tsx (SSR) → search-index
        │ Vite builds client assets (styles.css + client.js)
        ▼
public/                                 output (pages, assets, search index)
        │ hydrateRoot
        ▼
src/client/entry.tsx                    hydration (search + theme toggle)
```

Key ownership rules:

- **Typst** owns article content and page-level metadata.
- **TypeScript build modules** own identity, link validation, graph, routing,
  base URL, and the static search index.
- **React components** own deterministic shell composition. They consume
  prepared data only and never read files, run Typst, or mutate the graph.
- **Theme CSS** owns presentation only. User themes override design tokens.
- **Client code** owns search interaction and theme preference persistence.

## Theming

Design tokens live in `src/styles/index.css` under `@theme` (e.g.
`--color-accent`, `--color-paper`, `--font-serif`). Tailwind turns each token
into utilities that compile to `var(...)`.

A user theme is a variable override layer:

```css
/* assets/themes/my-theme/theme.css */
:root {
  --color-accent: #e63946;   /* re-skins the whole site */
  --color-paper:  #faf8f0;
  --font-serif:   Georgia, serif;
}
```

Select the theme in `typwiki.config.ts` (`theme: "my-theme"`); the build copies
it to `public/assets/themes/<id>/` and loads it after the base `styles.css`.
This matches the Docusaurus/Infima and MkDocs Material model.

Dark mode uses a `data-theme` attribute on `<html>` set by the toggle; a
`prefers-color-scheme` media query provides the no-JavaScript fallback.

## Authoring

```typst
#import "/lib/typwiki.typ": page, wiki, tags, environment

#show: page.with(
  id: "typst",
  title: "Typst",
  tag-table: true,   // shell shows tags/backlinks for this page
  link-table: true,
)

#tags((topic: ("typesetting", "knowledge-management"), status: "active"))

Typst is a great typesetting system. See #wiki("knowledge/graph")[graph].
```

- `tag-table` / `link-table` are recorded in metadata and drive which relation
  sections the shell renders; Typst itself renders no tables for them.
- Build-time inputs (`typwiki-known`, `typwiki-base-url`,
  `typwiki-page-prefix`) are injected by the pipeline, so the same source
  compiles standalone or through Typwiki.

## Page IDs and Routes

A page ID is the stable target for `#wiki(...)`; it does not need to match the
source file path. Configure the URL namespace in `typwiki.config.ts`:

```ts
routing: {
  pagePrefix: "/p",
  reservedPaths: ["/assets"],
},
```

## Development

```sh
npm install
npm run check
npm run build
npm run serve     # http://127.0.0.1:4173
```

`npm run serve` watches `pages/`, `lib/`, and `assets/`; it rebuilds the site
and reloads browsers via SSE, surfacing build diagnostics in an overlay.

## Future Work

- Incremental index/rendering caches (benchmark first).
- More built-in themes and a theme-authoring guide.
- Typst 0.15 HTML export is experimental; watch for changes in generated markup.
