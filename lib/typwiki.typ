// typwiki.typ
// This is the default template file for Typwiki.
// It defines the page, wiki, and tags macros for use in Typwiki pages.

// The page macro defines a page with a given body, id, title, and table options.
#let index-path = "/.typwiki/generated/site-index.json"
#let site-index() = json(index-path)
#let page-url(id) = {
  let prefix = site-index().routing.pagePrefix
  prefix + "/" + id + "/"
}
#let known-page(id) = site-index().pages.filter(item => item.id == id).len() > 0

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




#let page(body, id: none, title: none, tag-table: false, link-table: false) = [
  #set document(title: title)

  #show: typwiki-refs

  #metadata((
    kind: "page",
    id: id,
    title: title,
    tagTable: tag-table,
    linkTable: link-table,
  )) <typwiki-page>
  #heading(level: 1)[#title]
  #body

  #if tag-table or link-table {
    let index = json(index-path)
    let current = index.pages.filter(item => item.id == id).at(0, default: none)

    if link-table {
      let backlinks = if current == none { () } else { current.backlinks }
      if backlinks.len() > 0 [
        #heading(level: 2)[Backlinks]
        #list(..backlinks.map(target => link(page-url(target))[#target]))
      ]
    }

    if tag-table {
      let tags = if current == none { () } else { current.tags }
      if tags.len() > 0 [
        #heading(level: 2)[Tag relations]
        #table(
          columns: (auto, auto),
          table.header([Tags], [Pages with this tag]),
          ..tags.map(tag => (
            raw(tag),
            index.tags.at(tag, default: ()).map(target => link(page-url(target))[#target]).join([、]),
          )).flatten(),
        )
      ]
    }
  }
]

// The wiki macro defines a link to another page with a given target and body.
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
