#import "/lib/typwiki.typ": *


#show: page.with(
  id: "typwiki-intro",
  title: "Typwiki Introduction",
  tag-table: true,
  link-table: true,
)

#tags((
  typwiki: (
    features: true,
    macros: true,
  )
))

#set math.equation(numbering: "(1)")

== Introduction

Typwiki is a knowledge management system built on top of Typst. It allows you to create and manage a personal wiki using Typst's typesetting capabilities. 

== Features

Here we'll test how Typst features are supported in Typwiki.

=== Inline Formats

Firstly, inline formats are supported well. we can use *bold* and _italic_ text, as well as `inline code`. #highlight("Highlight") is also supported. What about colors? Typst support colors but it needs special #html.elem("span", attrs: (style: "color: red;"))[experimental] methods. You can use `#html.elem("span", attrs: (style: "color: red;"))` but it only works in HTML output (not PDF). Also we can use emojis! 🎉

=== Code Blocks


Then, how about code blocks? Typwiki supports code blocks with syntax highlighting. For example, here's a Python code block:

```python
def hello_world():
    print("Hello, world!")
```

Wow, that was easy! We can also use other languages like JavaScript, Rust, Julia, and more.


=== Lists

- Unordered lists are supported.
- You can do this in Markdown style.
  - Nested lists are also supported.
    - You can go even deeper if you want.

Ordered lists are also supported:

1. First item
2. Second item
   1. Nested item
   - Another nested item


=== Math

Typwiki supports Typst-style math. For example, we can write inline math like $E=m c^2$ or display math like:

$
  F(b) - F(a) = integral_a^b f(x) "d"x
$ <eq:newton-leibniz>

And in addition, we can reference equations using the `eq:` prefix. For example, we can reference the Newton-Leibniz formula above as @eq:newton-leibniz.

=== Citations

Typst has native bibliography support, and Typwiki inherits this feature. You can include a bibliography in your Typwiki pages by using the `#bibliography` directive. For example, you can include a bibliography file and just cite it like @hotellingEconomicsExhaustibleResources1931. 

=== Footnotes

Footnotes are also supported in Typwiki. You can create footnotes using the `#footnote` directive. For example, you can add a footnote like this: #footnote("This is a footnote.").




== Typwiki Macros

=== Theorem and Definition Macros

Typwiki provides macros for defining theorems and definitions. You can use the `#theorem` and `#definition` macros to create these elements in your Typwiki pages. For example, you can define a theorem with or without titles:

#theorem(title: "Continuous Bounded Theorem")[
  Let $f$ be a continuous function on the closed interval $[a, b]$. Then $f$ is bounded on $[a, b]$.
] <thm:continuous-bounded>

#theorem[
  Every continuous function on a compact interval is bounded.
]

#definition(title: "Limit")[
  A sequence approaches a limit when its terms get arbitrarily close to that value.
]

#definition[
  A project tag marks a page as part of the project.
]

#lemma(title: "Sample Lemma")[
  This is a sample lemma.
] <lem:sample>

All theorems, definitions, and lemmas are automatically numbered and can be referenced throughout your Typwiki pages. For example, see @thm:continuous-bounded and @lem:sample.

You can also create your own custom environments using the `#thmenvironment` macro. For example, you can create a "Proposition" environment by `#let proposition = thmenvironment("Proposition")` and then use it like this:

#let proposition = thmenvironment("Proposition")

#proposition(title: "Sample Proposition")[
  This is a sample proposition.
] <prop:sample>

Notice that the proposition is also automatically numbered and can be referenced as @prop:sample. Every thmenvironment is automatically numbered _separately_.



=== CeTZ (Planned)

Typwiki plans to support CeTZ, a Typst extension for creating interactive content. This will allow users to create dynamic and interactive pages within their Typwiki. For example, you can create interactive diagrams, quizzes, and more.


#bibliography("../../bib/ref.bib", style: "chicago-author-date")