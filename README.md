# @mickaelbeauregard/design-system

A brand-neutral design system for every project: W3C design tokens, layered
CSS components, and a `ds check` that fails the build when a project drifts off
them. Each project brings one file — its brand — and gets the rest.

| Part | What it gives a project |
|------|-------------------------|
| `tokens/core.tokens.json` | Type ramp (fluid, zoom-safe), spacing, radius, elevation, motion, layers |
| `templates/brand.tokens.json` | The brand's palette, its colour roles and typefaces — the one file a project edits |
| `ds build` | CSS variables, a Tailwind v4 theme, a Claude Design token file, and a catalogue page |
| `css/` | Reset, base, layout and components in `@layer`s: button, link, card, field, switch, tag, badge, alert, dialog |
| `ds check` | 15 rules ([docs/RULES.md](docs/RULES.md)): colours only from tokens, AA contrast measured in every theme, the type ramp, min-width breakpoints, focus rings, shadows, radii, motion, spacing |

[DESIGN.md](DESIGN.md) is the system's own book: what each role is for, the
ramp, the grounds, the components. Every rule's reason is in
[docs/RULES.md](docs/RULES.md); every structural choice in [docs/adr/](docs/adr/).

## Install

Public, installed straight from this repository at a version tag — no
registry, no token, locally or on any build host:

```bash
npm install -D "git+https://github.com/mickaelbeauregard/design-system.git#semver:^0.2.0"
```

Write the `git+https://` form, not the `github:` shorthand: the shorthand asks
git over SSH, which a build host has no key for. The lockfile pins the exact
commit, and a clean install fetches it over HTTPS.

## Set up a project

```bash
npx ds init              # plain CSS
npx ds init --tailwind   # Tailwind v4
npx ds init --dark       # also a dark theme
```

That writes `design/brand.tokens.json`, `ds.config.json` and a `DESIGN.md`
skeleton, and never overwrites a file that exists. Then:

1. Put the brand in `design/brand.tokens.json`: replace the seeds with its
   colours, re-point any role, name its typefaces.
2. `npx ds build && npx ds check` — the check measures every colour pairing;
   the catalogue (`design/catalogue.html`) shows them all.
3. Import the CSS (below), and add `ds check` to the `lint` script.
4. Paste [templates/AGENTS.snippet.md](templates/AGENTS.snippet.md) into the
   project's `AGENTS.md`, so an agent working there knows the system's rules.

**Plain CSS (Vite, Astro, a static site)** — first lines of the main stylesheet:

```css
@import "../design/tokens.css";
@import "@mickaelbeauregard/design-system/css";
```

**Next.js** — the same two imports at the top of `app/globals.css`.

**Tailwind v4** — the theme replaces Tailwind's palette: `bg-action`,
`text-text-muted`, `p-md`, `rounded-lg`, `shadow-sm` come from the tokens, and
the only colour utilities left are the brand's roles and scales:

```css
@import "tailwindcss";
@import "../design/tokens.tailwind.css";
@import "@mickaelbeauregard/design-system/css/tailwind.css";
```

The project's own CSS stays unlayered, which beats every layer the system
uses: overriding a component never needs `!important` or a longer selector.

## Commands

| | |
|---|---|
| `ds init [--tailwind] [--dark]` | Scaffold the brand file, config and DESIGN.md |
| `ds build` | Write every file under `out` in `ds.config.json` |
| `ds check` | Run the rules; exit 1 on a failure |
| `ds catalogue [--out file]` | Write the catalogue page only |

## Updating a project

```bash
npm install -D "git+https://github.com/mickaelbeauregard/design-system.git#semver:^0.3.0"
npx ds build && npx ds check
```

[CHANGELOG.md](CHANGELOG.md) says what each version changes. A major version
renames or removes a role, a token or a class; a project then fails
`ds check` (DS-0001) or `ds build` until it follows.

## Working on the system

```bash
npm test                 # unit tests: colour maths, tokens, every check made to fail
npm run check            # the system held to its own rules
npm run build            # rebuild the catalogue from the default brand
npm run test:visual      # screenshot comparison of the catalogue, both widths, both themes
```

Release: bump `version` in `package.json`, add the CHANGELOG entry, commit,
then tag `vX.Y.Z` and push the tag. The tag is the release: projects resolve
`#semver:^X.Y.0` against the tags.
