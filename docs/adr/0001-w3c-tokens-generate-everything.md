# ADR-0001 — W3C tokens are the source; every other format is generated

**Date**: 2026-10-05 · **Status**: accepted

## Context

The system serves plain-CSS sites, Next.js apps and Tailwind projects, and
should be readable by Claude Design. Hand-maintaining a CSS file, a Tailwind
theme and a design-tool export means three places for one value, and one of
them is always wrong — the project this grew out of had already deleted a YAML
copy of its tokens for exactly that reason.

## Decision

Tokens are written once, in the W3C Design Tokens Format (DTCG 2025.10), and
`ds build` generates CSS variables, a Tailwind v4 `@theme`, Claude Design's
list-shaped tokens and a catalogue. Generated files are committed so a change
can be reviewed, and DS-0110 fails when they drift from the tokens.

Three needs the format does not cover live under one `$extensions` namespace,
`io.github.mickaelbeauregard.ds`:

- `alpha` on a colour alias — a tint that follows its source, emitted as
  `color-mix()`. Freezing the tint as its own literal is how a composite stops
  matching its colour.
- `fluid` on a dimension — `$value` is the phone size, `max` the wide one,
  emitted as a zoom-safe `clamp()`.
- `scale` on a colour — eleven OKLCH steps generated from a seed.

## Alternatives

- **Style Dictionary or Terrazzo.** Both read DTCG and would replace
  `src/build.mjs`. Rejected for now: each brings a dependency tree and a config
  surface to every project, against ~300 lines that do exactly the outputs
  needed. Revisit if a fourth output format appears.
- **CSS custom properties as the source.** No types, no descriptions, no
  aliases a tool can follow, nothing Tailwind or a design tool can read.

## Consequences

Any DTCG tool can read a brand file, except for the three extensions, which it
will ignore (an `alpha` alias then reads as the opaque colour). Values outside
DTCG's units — `ch`, `%` — cannot be tokens; the measure is in `rem`.
