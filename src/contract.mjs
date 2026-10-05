/**
 * The contract between the system and a brand.
 *
 * The components only ever read these roles, never a palette step, so a brand
 * that fills every role gets every component right without touching its CSS.
 * DS-0001 fails the build on a missing role and DS-0109 measures the pairs
 * below in every theme. DESIGN.md → Colour roles says what each one is for.
 */

export const ROLES = {
  'color.bg': 'Page background.',
  'color.surface': 'Cards, dialogs, fields: anything raised off the page.',
  'color.surface-muted': 'Secondary fills: a sunken panel, a tonal button, a tag.',
  'color.surface-inverse': 'A dark band inside the light theme (or the light one inside dark).',
  'color.border': 'Dividers and card edges. Decorative: no contrast requirement.',
  'color.border-strong': 'Borders that identify a control (fields, outlined buttons). 3:1 against its ground.',
  'color.text': 'Body copy and headings.',
  'color.text-muted': 'Secondary copy: captions, hints, metadata.',
  'color.text-on-inverse': 'Text on surface-inverse.',
  'color.text-on-inverse-muted': 'Secondary text on surface-inverse.',
  'color.link': 'Inline link text.',
  'color.focus': 'The focus ring. 3:1 against every ground it can sit on.',
  'color.action': 'The primary action: the one thing the page is asking for.',
  'color.action-hover': 'The primary action under the pointer.',
  'color.on-action': 'Text and icons on action and action-hover.',
  'color.accent': 'A second emphasis, used sparingly. May alias action.',
  'color.accent-hover': 'The accent under the pointer.',
  'color.on-accent': 'Text and icons on accent and accent-hover.',
  'color.success-surface': 'Success: background of a badge or alert.',
  'color.success-text': 'Success: text on success-surface.',
  'color.success-border': 'Success: the edge of a badge or alert.',
  'color.warning-surface': 'Warning: background of a badge or alert.',
  'color.warning-text': 'Warning: text on warning-surface.',
  'color.warning-border': 'Warning: the edge of a badge or alert.',
  'color.danger-surface': 'Error or destructive: background of a badge or alert.',
  'color.danger-text': 'Error or destructive: text on danger-surface, and a field error message.',
  'color.danger-border': 'Error or destructive: the edge of a badge, an alert, an invalid field.',
  'color.info-surface': 'Information: background of a badge or alert.',
  'color.info-text': 'Information: text on info-surface.',
  'color.info-border': 'Information: the edge of a badge or alert.',
  'color.disabled-surface': 'A control that cannot be used yet. Exempt from contrast, never from legibility.',
  'color.disabled-text': 'Text on disabled-surface.',
  'color.shadow': 'The colour every resting shadow is built from. Tinted by the ink, never pure black.',
  'color.shadow-strong': 'The colour of the raised shadows.',
  'color.backdrop': 'Behind an open dialog.',
  'font.body': 'Running text and controls.',
  'font.display': 'Headings. May alias font.body.',
  'font.mono': 'Code and tabular figures.',
};

const AA = 4.5;
const NON_TEXT = 3;

const each = (fgs, bgs, min) => fgs.flatMap((fg) => bgs.map((bg) => ({ fg, bg, min })));

/** Every pairing the components actually paint. Measured in every theme. */
export const PAIRS = [
  ...each(['color.text', 'color.text-muted'], ['color.bg', 'color.surface', 'color.surface-muted'], AA),
  ...each(['color.link'], ['color.bg', 'color.surface'], AA),
  ...each(['color.text-on-inverse', 'color.text-on-inverse-muted'], ['color.surface-inverse'], AA),
  ...each(['color.on-action'], ['color.action', 'color.action-hover'], AA),
  ...each(['color.on-accent'], ['color.accent', 'color.accent-hover'], AA),
  ...['success', 'warning', 'danger', 'info'].map((s) => ({ fg: `color.${s}-text`, bg: `color.${s}-surface`, min: AA })),
  ...each(['color.danger-text'], ['color.bg', 'color.surface'], AA),
  ...each(['color.border-strong'], ['color.bg', 'color.surface'], NON_TEXT),
  ...each(['color.focus'], ['color.bg', 'color.surface'], NON_TEXT),
];
