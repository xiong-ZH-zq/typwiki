# Typwiki

A small but efficient static wiki system based on Typst typesetting languages. 🛩️

Typwiki:

- is aimed for **pure text writing** for all kinds of knowledge storage.
- supports **backlinks**, **tags**, **code highlighting**, **math formulas** and **bibliography**.
- is easy to be extended with your own typst templates or theme.
- can be used with live server for **live preview**.

In addtion, typwiki would be highly customizable (Themes, typst templates).


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

- `tag-table` displays the current page's tags and pages sharing each tag.
- `link-table` displays backlinks to the current page.

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




