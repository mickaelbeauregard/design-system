# ADR-0005 — Public, installed from git tags

**Date**: 2026-10-05 · **Status**: accepted (supersedes ADR-0004)

## Context

ADR-0004 made the package private on GitHub Packages. Within the hour it meant
a read-only token on every machine and on every build host of every project,
renewed when it expired, or deploys fail at install. GitHub's npm registry asks
for a token even to install a public package, so making the package public
there would not have removed the step. The system holds no brand, no secret and
no client data.

## Decision

The repository is public and projects install it from a version tag:
`git+https://github.com/mickaelbeauregard/design-system.git#semver:^X.Y.0`.
A pushed `vX.Y.Z` tag is the release. There is no registry and no publish job.

## Alternatives

- **Public on npmjs.com** — the usual home, `npm i @mickaelbeauregard/design-system`,
  but it needs an npm account and a publish token kept as a repository secret.
  Worth it if anyone outside these projects starts using the system.
- **The `github:` shorthand** — npm resolves it over SSH, and build hosts have no
  SSH key. The `git+https://` form works everywhere.

## Consequences

No credential anywhere. The lockfile pins a commit and npm fetches it over
HTTPS. The code is MIT: anyone may reuse it with the copyright notice, which
also lets whoever inherits a site built on it keep maintaining that site.
