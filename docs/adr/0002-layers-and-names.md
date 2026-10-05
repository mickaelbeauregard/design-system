# ADR-0002 — Tailwind's layer names, a ds- prefix, variants as data attributes

**Date**: 2026-10-05 · **Status**: accepted

## Context

The CSS must sit under any project — plain, Next.js or Tailwind — and lose to
that project's own CSS without anyone raising specificity. Two fixes in the
project this came from were lost to specificity before its motion rules moved
onto a variable.

## Decision

- Every file is wrapped in `@layer` using Tailwind v4's names, in its order:
  `theme, base, components, utilities`. In a Tailwind project the system's
  components join Tailwind's components layer, so a utility class still wins;
  elsewhere the project's unlayered CSS beats every layer.
- Every class starts with `ds-`, so a project can adopt the system one
  component at a time without its own `.card` or `.btn` colliding.
- Variants, sizes and statuses are data attributes (`data-variant`,
  `data-size`, `data-status`). A state re-points the component's own
  `--button-*`-style variables; the declarations that paint are written once.
- Colours that depend on the ground (text, link, focus, control outline) are
  read through `--ground-*`, which grounds re-point and surfaces reset.

## Alternatives

- **Unprefixed classes.** Shorter, and a collision with every existing project.
- **BEM modifiers** (`ds-button--accent`). Longer, and a variant and a size
  combine into two classes that can contradict each other; one attribute per
  axis cannot.
- **Shadow DOM web components.** Real isolation, but no SSR without extra
  work, and the brand would have to pierce the shadow root anyway.

## Consequences

Markup is a little more verbose. In exchange nothing in the system ever needs
`!important` (DS-0101), and a project overrides any component with a plain
selector.
