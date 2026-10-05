# RULES.md

> Every rule here is a check that fails `ds check`. A rule with no **Why** does
> not hold; a rule that cannot be checked is a convention and belongs in a
> project's own CONVENTIONS.md. There is no Status field: a rule is in force or
> it is not in this file. `test/rules-catalogue.test.mjs` fails if this file and
> `src/checks.mjs` disagree.

A project runs them with `npx ds check`, usually from its `lint` script.

**Excusing one line.** A comment on the line or the one above:
`/* ds-allow DS-0100: the mask channel needs an opaque literal */`. It names
the rule and says why; DS-0004 rejects one that does not.

**Turning a rule off.** `"check": { "off": { "DS-0108": "why, in a sentence" } }`
in `ds.config.json`. The reason is printed on every run, so the exception stays
visible.

## 1. Format

    DS-XXXX — <short title>
      Why      : <the mistake it prevents, and where it was made>
      Rule     : <what to do instead>
      Enforced : <the command>

## 2. Tokens

### DS-0001 — every role in the contract is defined

    Why      : Components read roles, never palette steps. A brand missing one
               leaves every component that reads it with an empty var(), which
               paints as transparent or inherited — wrong, and silent.
    Rule     : The brand defines every role in src/contract.mjs (DESIGN.md →
               Colour roles), even when it only aliases another.
    Enforced : ds check

### DS-0002 — every token says what it is for

    Why      : A value without a purpose gets reused for the wrong job: the
               next person picks it because it is the right colour, not the
               right role, and the two drift apart the day one of them moves.
    Rule     : Every token carries a $description of its job.
    Enforced : ds check

### DS-0003 — the token files are valid

    Why      : An alias to a renamed token, a cycle, a value in the wrong
               format — each one would otherwise surface as a missing variable
               in the browser, far from its cause.
    Rule     : Every alias resolves, every value parses for its $type, every
               name can become a CSS variable, and a theme only re-points
               colours that exist.
    Enforced : ds check (and ds build refuses to write)

### DS-0004 — an allowance names its rule and gives a reason

    Why      : An exception nobody can read the reason for is never
               revisited, and a bare marker is the easy way to get a commit
               through a guard — the misuse the project these rules come from
               had to warn against in writing.
    Rule     : `ds-allow DS-XXXX: <reason>` — the rule's id and at least a
               short sentence. Without both it excuses nothing.
    Enforced : ds check

## 3. CSS

### DS-0100 — colours live in the token files, nowhere else

    Why      : A colour written at a call site does not move when the palette
               moves, and the drift is invisible in review. An amber accent
               survived that way at 2.05:1. A hex-only check is not enough:
               `color: white` and a raw rgba() both shipped past one.
    Rule     : No hex, no colour function, no named colour in any checked CSS
               — :root included — nor as a Tailwind arbitrary value or an inline
               style colour in markup. Use a role: var(--color-…). transparent
               and currentColor are keywords, not colours, and are fine.
    Enforced : ds check

### DS-0101 — no !important

    Why      : Specificity wars are unwinnable and the next override is
               always worse. Layers decide precedence here: the project's
               unlayered CSS already beats every component.
    Rule     : No !important. If a rule will not apply, fix the selector or
               move it out of a layer.
    Enforced : ds check

### DS-0102 — type comes from the ramp and the family tokens

    Why      : A scale only works while everything is on it. A component that
               writes its own clamp() or 1.0625rem puts a step between two
               others that nobody can see from the tokens; eleven such sizes
               once collected beside a ramp.
    Rule     : Outside :root, @theme and @font-face, font-size and font-family
               are a var() or inherit, and the font shorthand only inherits.
    Enforced : ds check

### DS-0103 — breakpoints are min-width — the phone is the base

    Why      : Most visitors arrive on a phone. Desktop-first CSS states the
               desktop value and takes it back in a max-width block, so the
               layout a phone gets is an override, easy to lose to a later edit.
    Rule     : No media or container condition that makes the narrow screen
               the exception: not max-width / max-inline-size, not the range
               syntax (width < …), not `not … (min-width)`. Write the phone
               value as the base and add a min-width query above it.
    Enforced : ds check (stylesheets, and media="" attributes in markup)

### DS-0104 — a focus indicator is never removed

    Why      : `outline: none` on the buttons made every donation button
               invisible to keyboard users, and it lasted months because a
               mouse never shows it. WCAG 2.4.7.
    Rule     : Never outline: none / 0, outline-width: 0, outline-style: none
               or outline-color: transparent. The ring is styled once, on
               :focus-visible, in base.css.
    Enforced : ds check

### DS-0105 — shadows come from the shadow tokens

    Why      : A one-off shadow flattens the elevation scale: once a fourth
               depth exists, the three that mean something stop reading as
               steps. Shadows built from pure black also turn warm grounds grey.
    Rule     : box-shadow is a var() — a --shadow-* token, or a component
               variable set from one — or none.
    Enforced : ds check

### DS-0106 — corner radii come from the radius tokens

    Why      : The radius is brand identity, not decoration; one card at 12px
               among cards at 16px looks like a bug, not a choice.
    Rule     : border-radius and its longhands are a var(), 0 or inherit.
               A circle is var(--radius-full), not 50%.
    Enforced : ds check

### DS-0107 — motion timing comes from the duration tokens

    Why      : The tokens are where reduced motion is honoured: under
               prefers-reduced-motion every --duration-* is 0ms and --motion is
               0. A literal 200ms keeps moving for the reader who asked it not to.
    Rule     : transition and animation durations and delays are var(--duration-…).
    Enforced : ds check

### DS-0108 — spacing comes from the spacing tokens

    Why      : Spacing is rhythm. Off-scale margins are individually invisible
               and collectively the reason a page feels uneven.
    Rule     : margin, padding and gap hold no literal length but 0, 1px and
               2px (hairline corrections). Use var(--spacing-…), or calc() over it.
    Enforced : ds check

## 4. Contrast and freshness

### DS-0109 — every role pairing passes WCAG AA, in every theme

    Why      : "Every pairing has been checked" was a sentence in a design doc
               with no script behind it. A palette that is low-contrast by
               temperament needs measuring, every time a token moves, in
               every theme.
    Rule     : 4.5:1 for text pairings, 3:1 for control borders and the focus
               ring (src/contract.mjs → PAIRS), plus any pair a project adds
               under check.pairs. Translucent colours are measured where they
               land.
    Enforced : ds check — the catalogue prints every ratio

### DS-0110 — the generated files match the tokens

    Why      : Generated files are committed so they can be reviewed. That
               makes a hand edit possible, and a token change without a rebuild
               ships the old values with every check green.
    Rule     : Never edit a generated file; change the tokens and run ds build.
    Enforced : ds check
