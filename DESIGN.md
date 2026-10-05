# DESIGN.md — the shared system

What every token and component is *for*. Values live in the token files, and
only there (DS-0100); the catalogue (`ds build` → `catalogue/index.html` here,
`design/catalogue.html` in a project) shows them rendered. A project's own
`DESIGN.md` describes its brand on top of this one and links here for the rest.

## Principles

- **Phone first.** The base value of every rule is the phone's; `min-width`
  adds the wide one (DS-0103). Most people arrive on a phone.
- **Roles, not colours.** Components read only the roles below. A brand
  re-points a role; it never edits a component.
- **One ramp, one spacing scale, three shadows, six radii.** A value off the
  scale fails `ds check`. A new need is a new token with a `$description`, or
  usually a sign the layout wants something else.
- **Layers decide precedence.** `theme < base < components < utilities`, and a
  project's unlayered CSS beats them all. No `!important`, ever (DS-0101).
- **Accessible by construction.** AA contrast measured in every theme
  (DS-0109), a focus ring nothing removes (DS-0104), 44px targets, motion that
  stops when asked (DS-0107), status that never relies on colour alone.

## Colour roles

Each brand fills all of them (DS-0001); `src/contract.mjs` holds the list and
the pairs DS-0109 measures.

| Group | Roles | For |
|-------|-------|-----|
| Grounds | `bg`, `surface`, `surface-muted`, `surface-inverse` | The page; anything raised; secondary fills; a dark band |
| Lines | `border`, `border-strong` | Decorative edges; edges that identify a control (3:1) |
| Text | `text`, `text-muted`, `text-on-inverse`, `text-on-inverse-muted`, `link` | Copy on the grounds above |
| Action | `action`, `action-hover`, `on-action` | The one thing the page is asking for |
| Accent | `accent`, `accent-hover`, `on-accent` | A second emphasis, sparingly. May alias action |
| Status | `success-*`, `warning-*`, `danger-*`, `info-*` — each `-surface`, `-text`, `-border` | Badges, alerts, field errors |
| States | `focus`, `disabled-surface`, `disabled-text` | The ring; a control not usable yet |
| Depth | `shadow`, `shadow-strong`, `backdrop` | Tinted by the ink, never pure black |

A brand's palette sits beside the roles. Give a seed colour
`"scale": true` and the build generates eleven OKLCH steps (`-50` … `-950`)
whose lightness is fixed per step, so step 600 of any hue carries white text
at AA and sits at AA on steps 50 and 100.

## Grounds

`data-ground="muted"` and `data-ground="inverse"` on a section change its
background. Text, link, focus and outline colours are read through
`--ground-*` variables, which the inverse ground re-points to the light-on-dark
roles — and which every surface component (card, dialog) points back. A light
card inside a dark band therefore stays dark-on-light without a single extra
selector. Two sections in a row should not share a ground.

## Type

One ramp, `--text-xs` to `--text-6xl`, with role aliases a project re-points:
`display`, `h1`–`h4`, `body`, `ui`, `small`. Every step from `lg` up is fluid
between 360px and 1280px, as `clamp(min, rem + vw, max)` — the rem term keeps
it zoomable (WCAG 1.4.4), which a pure-vw middle term is not. Each step carries
its line height as `--text-*--line-height`. Two families: `--font-body` and
`--font-display` (plus `--font-mono` for code).

## Spacing, shape, depth, motion

| | Tokens | Rule of thumb |
|---|---|---|
| Spacing | `--spacing-2xs` … `--spacing-4xl` (0.25–6rem) | Section padding is `3xl` on a phone, `4xl` wide — never less |
| Radius | `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `full` | Cards and dialogs `lg`; buttons, pills, avatars `full` |
| Elevation | `--shadow-sm` · `md` · `lg` | Rest · under the pointer · the top. Three is the scale |
| Motion | `--duration-fast` · `base` · `slow`, `--ease-*`, `--motion` | Lifts multiply `--motion`; reduced motion sets it and every duration to 0 |

## Components

Each CSS file opens with its markup and its variants; that comment is the
component's documentation.

| Component | File | Notes |
|-----------|------|-------|
| Button | `css/components/button.css` | primary, accent, secondary, tonal, ghost; `sm`; full width; `aria-disabled` |
| Link | `css/components/link.css` | inline (base.css), standalone 44px, quiet; works on `<button>` |
| Card | `css/components/card.css` | Media beside the body once the card is 34rem wide (container query); whole-card link |
| Field | `css/components/field.css` | label, hint, error, `aria-invalid`; checkbox, radio, switch |
| Tag, badge | `css/components/tag.css` | Neutral or `data-status` |
| Alert | `css/components/alert.css` | `data-status`, info by default |
| Dialog | `css/components/dialog.css` | Native `<dialog>` with `showModal()` |
| Layout | `css/layout.css` | container, section, stack, cluster, grid, prose, grounds |
| Utilities | `css/utilities.css` | `[hidden]`, visually hidden, skip link |

Variants and sizes are data attributes (`data-variant`, `data-size`,
`data-status`); every class starts with `ds-`, so a project's own classes never
collide with the system's while it migrates.

## Do / don't

- **Do** re-point a role in the brand file to change a colour everywhere.
- **Do** make a button a decision; a way back, more of the same or a fallback is a link.
- **Do** write the status in words: colour is how the eye finds it, not what it means.
- **Don't** write a colour, size, radius, shadow or duration in a component. Use the token.
- **Don't** use a palette step in a component. Components read roles.
- **Don't** add a third shadow depth or a fourth font family. The scales are the design.
