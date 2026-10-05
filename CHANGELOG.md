# Changelog

Each entry says what a project has to do. A major version renames or removes a
role, token, class or data attribute; a minor one adds; a patch fixes.

## 0.2.0 — 2026-10-05

- A fluid size can name its own viewport range: `"fluid": { "max": …, "range":
  [800, 1280] }`. Without one it still grows across 360–1280px. Lets a brand
  keep a size it already had as `clamp(min, Nvw, max)` exactly. Nothing to do.

## 0.1.0 — 2026-10-05

First version.

- W3C tokens (DTCG 2025.10): core structure, a brand template with 35 colour
  roles, an optional dark theme as role overrides.
- `ds build`: CSS variables, Tailwind v4 theme, Claude Design tokens, catalogue.
- `ds check`: 15 rules, AA contrast measured in every theme.
- Components: button, link, card, field, switch, tag, badge, alert, dialog;
  layout primitives and grounds.
