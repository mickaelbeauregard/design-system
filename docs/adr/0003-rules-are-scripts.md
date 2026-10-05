# ADR-0003 — Rules are dependency-free scripts, and every one is made to fail

**Date**: 2026-10-05 · **Status**: accepted

## Context

In the projects this system serves, a documented rule with no check behind it
has let real defects through — a focus ring deleted from every donation button
among them. Those projects already run small Node guards instead of ESLint or
Stylelint.

## Decision

`ds check` is the system's rules as code, built on Node's standard library
and a deliberately small CSS reader (`src/css.mjs`): comments blanked, strings
respected, nesting followed. `docs/RULES.md` holds every rule's Why and a test
fails if it and `src/checks.mjs` disagree. Every check has a test that feeds it
a violation; a guard that has only ever reported clean has not been shown to
read anything.

An exception is a `ds-allow DS-XXXX: reason` comment on one line, or a rule
turned off in `ds.config.json` with a sentence that is printed on every run.

## Alternatives

- **Stylelint with a plugin set.** Mature, but a dependency tree in every
  project, a config to keep in step, and it cannot measure contrast across
  themes from the tokens — the rule that matters most.
- **Prose only.** Tried; see Context.

## Consequences

The CSS reader is not a full parser. It reads what real stylesheets contain;
an exotic construct can slip past it, and the fix is a test with that
construct, then the reader.
