/**
 * The catalogue: one self-contained HTML page showing a brand's system —
 * roles with their measured contrast, scales, type, spacing, shape, and every
 * component in every state. No network: the CSS is inlined, so the file opens
 * from disk, from an artifact, or from a pull request preview alike.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_ROOT } from './config.mjs';
import { renderCss, cssValue } from './build.mjs';
import { ROLES, PAIRS } from './contract.mjs';
import { contrast, over, toHex } from './color.mjs';
import { stripComments } from './css.mjs';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Inline a stylesheet and the @imports it makes, depth first, in order.
 *  Comments go first: index.css shows a project's @import lines as usage. */
function inline(file) {
  const src = stripComments(readFileSync(file, 'utf8'));
  return src.replace(/@import\s+"([^"]+)";/g, (_, rel) => inline(join(file, '..', rel)));
}

export function renderCatalogue(system, config) {
  const { base, themes, themeNames } = system;
  const tokens = [...base.tokens.values()];
  const cls = (name) => `sw-${name}`;
  const varOf = (path) => `--${path.replaceAll('.', '-')}`;

  /* One class per swatch instead of inline style attributes, which a project's
     own rules usually forbid and which no stylesheet-wide check can see. */
  const swatchCss = [
    ...tokens.filter((t) => t.type === 'color').map((t) => `.${cls(t.name)} { background: var(--${t.name}); }`),
    ...tokens
      .filter((t) => t.path.startsWith('text.'))
      .map((t) => `.${cls(t.name)} { font-size: var(--${t.name}); line-height: var(--${t.name}--line-height); }`),
    ...tokens.filter((t) => t.path.startsWith('spacing.')).map((t) => `.${cls(t.name)} { inline-size: var(--${t.name}); }`),
    ...tokens.filter((t) => t.path.startsWith('radius.')).map((t) => `.${cls(t.name)} { border-radius: var(--${t.name}); }`),
    ...tokens.filter((t) => t.type === 'shadow').map((t) => `.${cls(t.name)} { box-shadow: var(--${t.name}); }`),
    ...PAIRS.map((p, i) => `.pair-${i} { background: var(${varOf(p.bg)}); color: var(${varOf(p.fg)}); }`),
  ].join('\n');

  const css = [
    renderCss(system),
    inline(join(PACKAGE_ROOT, 'css', 'index.css')),
    readFileSync(join(PACKAGE_ROOT, 'catalogue', 'catalogue.css'), 'utf8'),
    `@layer components {\n${swatchCss}\n}`,
  ].join('\n');

  const valueOf = (t) => cssValue(t, base.resolved.get(t.path));
  const hexIn = (theme, path) => toHex(themes[theme].resolved.get(path).value);

  const roles = Object.keys(ROLES)
    .filter((p) => p.startsWith('color.') && base.tokens.has(p))
    .map((p) => {
      const t = base.tokens.get(p);
      const values = themeNames.map((th) => `<code>${esc(hexIn(th, p))}</code>`).join(' / ');
      return `<li class="cat-role"><span class="cat-chip ${cls(t.name)}"></span><span><strong>${esc(t.name)}</strong><br><span class="ds-muted">${esc(ROLES[p])}</span><br>${values}</span></li>`;
    })
    .join('\n');

  const pairs = PAIRS.map((p, i) => {
    const ratios = themeNames
      .map((th) => {
        const r = themes[th].resolved;
        let bg = r.get(p.bg)?.value;
        const fg = r.get(p.fg)?.value;
        if (!bg || !fg) return `${th}: —`;
        if ((bg.alpha ?? 1) < 1) bg = over(bg, r.get('color.bg').value);
        const ratio = contrast(fg, bg);
        return `${th} <strong>${ratio.toFixed(2)}</strong>${ratio + 1e-9 < p.min ? ' ✗' : ''}`;
      })
      .join(' · ');
    return `<li class="cat-pair pair-${i}"><span class="cat-pair-sample">Aa</span><span>${esc(p.fg.slice(6))} on ${esc(p.bg.slice(6))}, needs ${p.min}:1<br>${ratios}</span></li>`;
  }).join('\n');

  const scales = tokens
    .filter((t) => t.type === 'color' && t.ext.scale)
    .map((seed) => {
      const steps = tokens.filter((t) => t.generated && t.path.startsWith(`${seed.path}-`));
      const items = steps.map((t) => `<li><span class="cat-step ${cls(t.name)}"></span><small>${esc(t.name.split('-').pop())}</small></li>`).join('');
      return `<div class="ds-stack" data-gap="xs"><p><strong>${esc(seed.name)}</strong> <code>${esc(valueOf(seed))}</code></p><ol role="list" class="cat-steps">${items}</ol></div>`;
    })
    .join('\n');

  const type = tokens
    .filter((t) => t.path.startsWith('text.'))
    .map((t) => `<li class="cat-type"><span><code>--${esc(t.name)}</code><br><small class="ds-muted">${esc(t.description ?? '')}</small></span><span class="${cls(t.name)}">Sphinx of black quartz</span></li>`)
    .join('\n');

  const each = (prefix, render) => tokens.filter((t) => t.path.startsWith(prefix)).map(render).join('\n');
  const spacing = each('spacing.', (t) => `<li class="cat-space"><code>--${esc(t.name)}</code><span class="cat-bar ${cls(t.name)}"></span><small>${esc(valueOf(t))}</small></li>`);
  const radius = each('radius.', (t) => `<li class="cat-shape"><span class="cat-box ${cls(t.name)}"></span><code>--${esc(t.name)}</code></li>`);
  const shadows = tokens
    .filter((t) => t.type === 'shadow')
    .map((t) => `<li class="cat-shape"><span class="cat-box ${cls(t.name)}"></span><code>--${esc(t.name)}</code></li>`)
    .join('\n');

  const components = readFileSync(join(PACKAGE_ROOT, 'catalogue', 'components.html'), 'utf8');
  const themeSwitch =
    themeNames.length === 2
      ? `<div class="ds-cluster" data-gap="xs" role="group" aria-label="Theme">${['system', ...themeNames]
          .map((t) => `<button class="ds-button" data-variant="secondary" data-size="sm" data-theme-set="${t}" aria-pressed="${t === 'system'}">${t}</button>`)
          .join('')}</div>`
      : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.name)} — design system</title>
<style>
${css}
</style>
</head>
<body>
<a class="ds-skip-link" href="#main">Skip to the catalogue</a>
<header class="ds-section" data-ground="inverse">
  <div class="ds-container ds-stack">
    <p class="cat-eyebrow">Design system catalogue</p>
    <h1>${esc(config.name)}</h1>
    <p class="ds-prose">Every role, step and component, rendered from this project's tokens: ${tokens.length} tokens, ${themeNames.length} theme${themeNames.length > 1 ? 's' : ''}. Generated by <code>ds build</code>; do not edit.</p>
    ${themeSwitch}
  </div>
</header>
<main id="main">
<section class="ds-section" id="roles">
  <div class="ds-container ds-stack" data-gap="xl">
    <h2>Colour roles</h2>
    <p class="ds-prose ds-muted">Components read only these. Values are listed per theme.</p>
    <ul role="list" class="ds-grid cat-roles">${roles}</ul>
    <h3>Pairings, measured</h3>
    <p class="ds-prose ds-muted">Every pairing the components paint, with its WCAG 2 contrast ratio. <code>ds check</code> fails under the minimum (DS-0109).</p>
    <ul role="list" class="ds-grid cat-pairs">${pairs}</ul>
  </div>
</section>
<section class="ds-section" id="scales" data-ground="muted">
  <div class="ds-container ds-stack" data-gap="xl">
    <h2>Scales</h2>
    <p class="ds-prose ds-muted">Generated in OKLCH from each seed, so the same step carries the same weight across hues.</p>
    ${scales || '<p>No generated scales in this brand.</p>'}
  </div>
</section>
<section class="ds-section" id="type">
  <div class="ds-container ds-stack" data-gap="xl">
    <h2>Type</h2>
    <p class="ds-prose ds-muted">Fluid steps grow from their phone size to their wide size between 360 and 1280px.</p>
    <ul role="list" class="ds-stack">${type}</ul>
  </div>
</section>
<section class="ds-section" id="shape" data-ground="muted">
  <div class="ds-container ds-stack" data-gap="xl">
    <h2>Spacing, radius, elevation</h2>
    <ul role="list" class="ds-stack" data-gap="xs">${spacing}</ul>
    <ul role="list" class="ds-cluster" data-gap="lg">${radius}</ul>
    <ul role="list" class="ds-cluster" data-gap="xl">${shadows}</ul>
  </div>
</section>
${components}
</main>
<script>
document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => {
  const t = b.dataset.themeSet;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
  document.querySelectorAll('[data-theme-set]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
}));
document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => document.getElementById(b.dataset.open).showModal()));
</script>
</body>
</html>
`;
}
