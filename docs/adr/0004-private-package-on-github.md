# ADR-0004 — A private, versioned package on GitHub Packages

**Date**: 2026-10-05 · **Status**: accepted

## Context

Several projects should share one system and pick up its fixes, without
the system being public.

## Decision

A scoped npm package, `@mickaelbeauregard/design-system`, published to GitHub
Packages by `.github/workflows/publish.yml` when a `vX.Y.Z` tag is pushed.
Semantic versions: a project upgrades on purpose, and a major version says it
must change something.

## Alternatives

- **A git dependency** (`github:…#v1`). No registry, but a private repository
  needs credentials in a git URL, which npm cannot read from an environment
  variable.
- **Copy into each project** (the shadcn model). No dependency, but a fix
  reaches no project on its own, and nine copies drift.
- **Public npm.** Simplest install; the user chose private.

## Consequences

Every machine and every build host needs `NODE_AUTH_TOKEN` with
`read:packages` (README → Install). A host without it fails at install.
