## Design system

This project uses `@mickaelbeauregard/design-system`. Its rules hold here and
`npx ds check` (part of `npm run lint`) fails the build on a break.

- **The brand is one file:** `design/brand.tokens.json`. Change a colour, a
  typeface or a role there, then `npx ds build`. Never edit the generated
  files (`design/tokens*.css`, the catalogue): DS-0110 catches it.
- **Components read roles, not colours.** In CSS use `var(--color-text)`,
  `var(--color-action)`… never a hex, `rgb()`, a named colour, or a palette
  step like `--color-brand-700` (DS-0100). The roles and what each is for:
  the design system's DESIGN.md → Colour roles, or `design/catalogue.html`.
- **Everything is on a scale:** font sizes `var(--text-…)`, spacing
  `var(--spacing-…)`, radii `var(--radius-…)`, shadows `var(--shadow-…)`,
  durations `var(--duration-…)`. A literal fails `ds check`.
- **Phone first:** base styles are the phone's; add `@media (min-width: …)`.
  Never `max-width` (DS-0103). Prefer a container query for a component.
- **Use the components before writing one:** `ds-button` (`data-variant`
  accent | secondary | tonal | ghost), `ds-link`, `ds-card`, `ds-field` /
  `ds-input`, `ds-switch`, `ds-tag`, `ds-badge`, `ds-alert`, `ds-dialog`, and
  the layout primitives `ds-container`, `ds-section`, `ds-stack`, `ds-cluster`,
  `ds-grid`. Each CSS file in the package opens with its markup.
- **An exception is one line, with a reason:**
  `/* ds-allow DS-0108: why this line is the exception */`.
- **Contrast is measured, not eyeballed:** a new pairing goes under
  `check.pairs` in `ds.config.json` so DS-0109 measures it.
