# AGENTS.md — design-system

> Entry point for AI agents working on the system itself. Projects that *use*
> it get `templates/AGENTS.snippet.md` instead.

## What this is

The shared design system behind every one of Mickael's projects: W3C tokens
(`tokens/`), a brand template (`templates/`), layered CSS (`css/`), and the
`ds` command (`bin/`, `src/`) that builds a project's files and checks it.
Every project depends on it, so a careless change breaks sites you cannot see
from here.

## Rules

1. **Read before you write.** `DESIGN.md` for what things are for,
   `docs/RULES.md` for the checks, `docs/adr/` for why it is built this way.
2. **Zero runtime dependencies.** Node built-ins only. Playwright is a dev
   dependency for the visual tests and nothing else.
3. **A rule is a check.** A new rule gets its Why in `docs/RULES.md` and its
   check in `src/checks.mjs` in the same change, plus a test in
   `test/checks.test.mjs` that makes it fail on purpose. The catalogue test
   fails if the two files disagree.
4. **The system obeys itself.** `npm run lint` runs `ds check` on this repo's
   own CSS and the full test suite.
5. **Look at it.** A CSS change is not done until `npm run build` and
   `npm run test:visual` have run, and the changed sections were looked at at
   375 and 1280, light and dark. Accept a baseline only for a change you meant.
6. **Version honestly.** Renaming or removing a role, token, class or data
   attribute is a major version; adding one is a minor. Every release gets a
   `CHANGELOG.md` entry that says what a project has to do.
7. **No auto-commit.** The user reviews before anything is committed or tagged.

## Traps

- **Components read roles, never palette steps.** `var(--color-brand-700)` in
  `css/` would work with the default brand and break with every other one.
- **Text, link and focus colours go through `--ground-*`.** A surface
  component that does not re-point them shows a dark band's light text on its
  own light surface.
- **`[hidden]` lives in the utilities layer on purpose.** Moved into base, any
  component's `display` would beat it.
- **DTCG colours are objects** in the 2025.10 spec; `"#hex"` strings are
  accepted as shorthand. Write new tokens either way, but never a CSS function
  as a `$value`.
- **Visual baselines are per platform.** They were made on macOS; CI does not
  run them.
