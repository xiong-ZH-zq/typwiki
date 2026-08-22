// typwiki.typ
// This is the default template file for Typwiki.
// It defines the page, wiki, and tags macros for use in Typwiki pages.
//
// Build-time configuration (site base URL, page prefix, and the set of known
// page IDs) is injected by the Typwiki build pipeline through `typst --input`
// instead of being read from a generated JSON file. This keeps Typst pages
// free of any dependency on the build output, so the same `.typ` source renders
// correctly whether compiled through Typwiki or by hand.

// Build-time configuration injected via `typst --input`:
//   --input typwiki-known="home,typwiki-intro"
//   --input typwiki-base-url="/typwiki"
//   --input typwiki-page-prefix="/p"
#let typwiki-known = sys.inputs.at("typwiki-known", default: "")
#let typwiki-base-url = sys.inputs.at("typwiki-base-url", default: "")
#let typwiki-page-prefix = sys.inputs.at("typwiki-page-prefix", default: "/p")

// The absolute URL for a page id under the configured routing.
#let page-url(id) = {
  typwiki-base-url + typwiki-page-prefix + "/" + id + "/"
}

// Whether a page id exists in the current site.
#let known-page(id) = typwiki-known.split(",").contains(id)

#let thmenvironment(name, kind: none) = {
  let environment-kind = if kind == none { "typwiki-" + name } else { kind }

  let make(body, title: none) = {
    let heading = context {
      let number = counter(figure.where(kind: environment-kind)).display("1")
      if title == none {
        [*#name #number:*]
      } else {
        [*#name #number:* (#title)]
      }
    }
    let content = [#heading #body]

    figure(kind: environment-kind, supplement: name, numbering: "1")[
      #context {
        if target() == "html" {
          html.elem(
            "div",
            attrs: (
              class: "typwiki-environment",
              data-typwiki-kind: environment-kind,
            ),
            content,
          )
        } else {
          content
        }
      }
    ]
  }

  make
}

// Macros for theorem, definition, and lemma environments
#let theorem = thmenvironment("Theorem")
#let definition = thmenvironment("Definition")
#let lemma = thmenvironment("Lemma")

// ref style for equations
#let typwiki-refs(content) = {
  show ref: it => {
    let equation = math.equation
    let element = it.element

    if element != none and element.func() == equation {
      link(
        element.location(),
        numbering(
          element.numbering,
          ..counter(equation).at(element.location()),
        ),
      )
    } else {
      it
    }
  }

  content
}

// Display equations get a visible number in HTML output. Typst's HTML export
// does not render equation numbers yet, so we wrap display equations in a
// container and emit the counter value ourselves. References (typwiki-refs)
// read the same counter, so the numbers always match.
#let typwiki-equations(content) = {
  show math.equation.where(block: true): it => context {
    let num = counter(math.equation).display(it.numbering)
    if target() == "html" {
      html.elem(
        "div",
        attrs: (class: "typwiki-equation"),
        html.elem("span", attrs: (class: "typwiki-equation-number"), num) + it,
      )
    } else {
      it
    }
  }

  content
}

// The page macro defines a page with a given body, id, title, and table options.
//
// `tag-table` and `link-table` are recorded in page metadata; the shell renders
// the actual tag and link relations. They no longer produce tables inside the
// article, so the Typst output carries no backlink/tag knowledge.
#let page(body, id: none, title: none, tag-table: false, link-table: false) = [
  #set document(title: title)

  #show: typwiki-refs
  #show: typwiki-equations

  #metadata((
    kind: "page",
    id: id,
    title: title,
    tagTable: tag-table,
    linkTable: link-table,
  )) <typwiki-page>
  #heading(level: 1)[#title]
  #body
]

// The wiki macro defines a link to another page with a given target and body.
// Known targets link to their page; unknown targets render as plain text.
#let wiki(target, body) = [
  #metadata((kind: "link", target: target)) <typwiki-link>
  #if known-page(target) {
    link(page-url(target))[#body]
  } else {
    body
  }
]

// The tags macro defines a list of tags for a page.
#let tags(value) = [
  #metadata((kind: "tags", value: value)) <typwiki-tags>
]
