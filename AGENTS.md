# AGENTS.md

## Commands

```sh
npm run check      # validate page IDs, links, tags, routing without writing output
npm run build      # compile pages to public/ (Typst + React SSR + client assets)
npm run serve      # development server with live reload and diagnostics
npm test           # unit + component tests (Vitest)
npm run lint       # Biome lint/format check
npm run format     # Biome auto-format
```

## Source Boundaries

- `pages/`: authored Typst articles.
- `lib/typwiki.typ`: shared Typst page helpers. It declares page metadata, wiki
  links, tags, and theorem-like environments. Build-time site config (base URL,
  page prefix, known page ids) is injected via `typst --input`, never read from
  a generated file.
- `src/build/`: the Node-side build pipeline. `discovery`, `typst-adapter`,
  `graph`, `routing`, `tags` are pure-data modules; `render-site.tsx` does the
  React SSR; `search-index.ts` builds the static search index; `vite.ts`
  produces the client assets.
- `src/components/`: React components shared between SSR and the hydrated
  client. They consume prepared data only — never files, Typst, or graph state.
- `src/client/`: the browser hydration entry.
- `src/styles/index.css`: Tailwind design tokens (`@theme`) and theme-neutral
  base/components CSS. User themes live under `assets/themes/<id>/theme.css`
  and override the tokens to re-skin the site.
- `assets/themes/`: theme presentation assets only.
- `tests/`: focused behavior tests and fixtures.
- `public/` and `.typwiki/generated/`: generated output; never edit them as
  source files.

## Invariants

- Preserve stable page IDs, `/p/<id>/` routing, and `baseUrl` behavior.
- Typst owns article semantics. TypeScript owns graph/routing data and shell
  composition. Typst never reads the generated index; the shell renders all
  relations (tags, backlinks, outgoing links, related pages).
- Only authored `#wiki(...)` links affect backlinks and outgoing links.
  Generated UI links never affect the graph.
- Keep shell components small and decoupled: they consume prepared data and do
  not read files, invoke Typst, or mutate graph state.
- Keep theme CSS responsible for presentation only, via token overrides.
- Preserve relative-resource and configured-homepage behavior when rewriting
  rendered HTML.
- SSR and client hydration must render the same tree for the same `#typwiki-data`.

## Testing

- Add focused tests with every behavior change.
- Component tests that touch the DOM (e.g. `ThemeToggle`) use
  `// @vitest-environment jsdom`.
- Run the smallest relevant test command first, then broader checks when
  applicable.
- Do not modify unrelated user-owned tests merely to make a suite pass.
