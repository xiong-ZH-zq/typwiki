# Typwiki

A small but efficient static wiki system based on Typst typesetting languages. 🛩️

Typwiki:

- is aimed for **pure text writing** for all kinds of knowledge storage.
- supports **backlinks**, **tags**, **outgoing links**, **related pages**, **code highlighting**, **math formulas** and **bibliography**.
- is easy to be extended with your own typst templates or theme.
- can be used with live server for **live preview**.
- ships with **client-side search** and a **light/dark/system theme toggle**.

In addition, typwiki is highly customizable (themes, typst templates).

### Architecture

Pages are authored in Typst and typeset by the Typst compiler. The output is
wrapped in a **React server-rendered shell** (nav, breadcrumbs, table of
contents, relations, footer) and deployed as plain static HTML — it works on
GitHub Pages and without JavaScript. In the browser, the same React tree
hydrates to power search and the color-scheme toggle. The build pipeline is
TypeScript (tsx + Vite + Tailwind).


## Requirements

- [Typst](https://github.com/typst/typst) >= 0.15.
- [Node.js](https://nodejs.org/en) >= 22.0 with npm.

>[!warning]
> Typwiki is based on HTML output features by Typst. And it is still an [experimental feature](https://typst.app/docs/reference/html/). 

### Why Typst?

It is _faster_ and more _elegant_ than $\LaTeX$, and has more features than Markdown. More to say, it has only one standard grammar system!

## Begin 

```sh
npm install
npm run check
npm run build
npm run serve
```

Open the localhost link to see your pages.

## Page Writing: A Quick Demo

A default minimal template is given in `lib` directory, the method to use this template is simply `#import` this template.

```typst
#import "/lib/typwiki.typ": page, wiki, tags, environment

#show: page.with(
  id: "typst",
  title: "Typst",
  tag-table: true,
  link-table: true,
)

#tags((
  topic: ("typesetting", "knowledge-management"),
  status: "active",
))

Typst is a great typesetting system. See #wiki("knowledge/graph")[graph] for more details.
```

- `tag-table` and `link-table` control which relation sections the site shell
  renders for this page (tags, backlinks, outgoing links, related pages). They
  are metadata flags only — the shell, not Typst, renders the actual sections.

### Themes

Typwiki is styled with Tailwind CSS design tokens. The built-in look lives in
`src/styles/index.css` as `@theme` tokens (e.g. `--color-accent`,
`--color-paper`, `--font-serif`); user themes are variable override layers.

A theme is a directory at `assets/themes/<theme-id>/` with a `theme.css` at its
root, selected in `typwiki.config.ts`:

```ts
theme: "academic-paper",
```

To create your own theme, copy that directory and override the tokens — no
component code changes:

```css
/* assets/themes/my-theme/theme.css */
:root {
  --color-accent: #e63946;   /* re-skins every accent in the site */
  --color-paper:  #faf8f0;
  --font-serif:   Georgia, serif;
}
```

Theme assets are copied to `public/assets/themes/<theme-id>/`; the selected
stylesheet is mounted after the base `styles.css` on generated pages and the
static home page. Themes never change page IDs, links, tags, or output routing.
This matches the customization model of Docusaurus/Infima and MkDocs Material.

Dark mode is driven by a `data-theme` attribute on `<html>` (set by the theme
toggle) with a `prefers-color-scheme` fallback when JavaScript is off.

### Page IDs and Routes

A page ID is the stable target for `#wiki(...)`; it does not need to match the source file path. For example, `pages/drafts/linear-algebra-v3.typ` can declare `id: "math/linear-algebra"` and retain that ID when the file moves.

Configure the URL namespace in `typwiki.config.ts`:

```ts
routing: {
  pagePrefix: "/p",
  reservedPaths: ["/assets"],
},
```

This produces `/p/math/linear-algebra/` for `id: "math/linear-algebra"`. `pagePrefix` controls the generated page directory and local development route. Typwiki always reserves `/` and `/__typwiki` for its root page and development endpoints; `reservedPaths` reserves additional paths and their descendants.

### Custom Homepage

By default, `public/index.html` is a generated directory of all pages. To use one existing Typst page as the project homepage, set its stable page ID in `typwiki.config.ts`:

```ts
homePageId: "typwiki-intro",
```

The selected page is still generated at `/p/typwiki-intro/`; its rendered HTML is also used for the root `public/index.html`. The ID refers to the value passed to `page.with(id: ...)`, not to the source file path. The root copy preserves the selected page's URL base for relative assets and links. An unknown `homePageId` makes `npm run check` and `npm run build` fail with a diagnostic. `public/` is generated output and should not be edited by hand. Restart `npm run serve` after changing `homePageId`; configuration is loaded at startup.

### GitHub Pages

The Pages workflow builds `public/index.html` as the site entry point and automatically sets `TYPWIKI_BASE_URL` to the repository name. For a repository named `typwiki`, GitHub Pages links become `/typwiki/p/<page-id>/` while generated content remains in `public/p/<page-id>/`. Do not put the repository name in `pagePrefix`; the workflow supplies it during deployment.

### Custom Environments

Use `environment` to define a theorem-like block. Each environment has an independent counter and supports native Typst labels and references.

```typst
#let theorem = environment("Theorem")
#let lemma = environment("Lemma")
#let proposition = environment("Proposition")

#theorem(title: "Continuous boundedness")[
  Every continuous function on a compact interval is bounded.
] <thm:continuous>

#lemma[The theorem applies to closed intervals.] <lem:closed-interval>

See @thm:continuous and @lem:closed-interval.
```

## GitHub Deploy

Create an empty repo on github and use:

```sh
git add .
git commit -m "deploy"
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<REPO>.git
# if you prefer SSH
# git remote add origin git@github.com:<YOUR-GITHUB-USERNAME>/<REPO>.git
git push -u origin main
```


Then Github workflow will do everything for you.




