#import "/lib/typwiki.typ": *

#show: page.with(
  id: "articles/backlink",
  title: "Backlink",
  tag-table: true,
  link-table: true,
)

#tags((
  typwiki: (
    features: true,
  )
))

#set math.equation(numbering: "(1)")


= Backlink in Typwiki

This is a test demo page to see the backlink feature in Typwiki. The backlink feature allows you to see which pages link to the current page. This is useful for navigating your wiki and finding related content.

You can use #wiki("typwiki-intro")[`#wiki(typwiki-intro)`] to link to other pages in your Typwiki. The backlink feature will automatically track these links and display them on the current page.


