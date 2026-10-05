import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flatten, resolve, NS } from '../src/tokens.mjs';
import { loadSystem, renderCss, renderTailwind, renderClaudeDesign, cssValue, FLUID_RANGE } from '../src/build.mjs';
import { loadConfig } from '../src/config.mjs';
import { project, templateBrand } from './helpers.mjs';

const tree = (t) => ({ tree: t, origin: new Map() });
const run = (t) => {
  const { tokens, errors } = flatten(tree(t));
  const r = resolve(tokens);
  return { tokens, resolved: r.resolved, errors: [...errors, ...r.errors] };
};

test('$type is inherited from the group and aliases resolve through chains', () => {
  const { resolved, errors } = run({
    color: { $type: 'color', a: { $value: '#112233' }, b: { $value: '{color.a}' }, c: { $value: '{color.b}' } },
  });
  assert.deepEqual(errors, []);
  assert.equal(resolved.get('color.c').value.css, '#112233');
  assert.equal(resolved.get('color.c').alias, 'color.b');
});

test('a missing alias, a cycle and a type mismatch are errors naming the token', () => {
  const { errors } = run({
    color: { $type: 'color', a: { $value: '{color.nope}' }, b: { $value: '{color.c}' }, c: { $value: '{color.b}' }, d: { $value: '{spacing.x}' } },
    spacing: { $type: 'dimension', x: { $value: { value: 1, unit: 'rem' } } },
  });
  assert.ok(errors.some((e) => e.includes('color.a') && e.includes('does not exist')));
  assert.ok(errors.some((e) => e.includes('cycle')));
  assert.ok(errors.some((e) => e.includes('color.d') && e.includes('dimension')));
});

test('W3C colour objects in sRGB and OKLCH, and the hex shorthand, all parse', () => {
  const { resolved, errors } = run({
    color: {
      $type: 'color',
      srgb: { $value: { colorSpace: 'srgb', components: [1, 0, 0], hex: '#FF0000' } },
      ok: { $value: { colorSpace: 'oklch', components: [0.5, 0.1, 140] } },
      short: { $value: '#0f0' },
    },
  });
  assert.deepEqual(errors, []);
  assert.equal(resolved.get('color.srgb').value.css, '#ff0000');
  assert.match(resolved.get('color.ok').value.css, /^oklch\(50% 0\.1 140\)$/);
});

test('an invalid value and an unnamed type fail with the path', () => {
  const { errors } = run({ spacing: { $type: 'dimension', x: { $value: '12px' } }, loose: { $value: 3 } });
  assert.ok(errors.some((e) => e.startsWith('spacing.x')));
  assert.ok(errors.some((e) => e.startsWith('loose')));
});

test('names must be able to become CSS variables', () => {
  const { errors } = run({ color: { $type: 'color', 'Brand Blue': { $value: '#00f' } } });
  assert.ok(errors.some((e) => e.includes('Brand Blue')));
});

test('alpha on an alias becomes color-mix() and the resolved colour carries the alpha', () => {
  const { tokens, resolved } = run({
    color: { $type: 'color', ink: { $value: '#000000' }, veil: { $value: '{color.ink}', $extensions: { [NS]: { alpha: 0.25 } } } },
  });
  assert.equal(cssValue(tokens.get('color.veil'), resolved.get('color.veil')), 'color-mix(in srgb, var(--color-ink) 25%, transparent)');
  assert.equal(resolved.get('color.veil').value.alpha, 0.25);
});

test('a fluid size is its phone value at 360px and its max at 1280px', () => {
  const { tokens, resolved } = run({
    text: { $type: 'dimension', h: { $value: { value: 2, unit: 'rem' }, $extensions: { [NS]: { fluid: { max: { value: 3, unit: 'rem' } } } } } },
  });
  const css = cssValue(tokens.get('text.h'), resolved.get('text.h'));
  const [, min, rem, vw, max] = css.match(/^clamp\(([\d.]+)rem, ([\d.]+)rem \+ ([\d.]+)vw, ([\d.]+)rem\)$/).map(Number);
  const at = (px) => rem * 16 + (vw / 100) * px;
  assert.ok(Math.abs(at(FLUID_RANGE[0]) - min * 16) < 0.01);
  assert.ok(Math.abs(at(FLUID_RANGE[1]) - max * 16) < 0.01);
});

test('a fluid range reproduces a size written as clamp(min, Nvw, max)', () => {
  /* clamp(2.5rem, 5vw, 4rem) is linear from 800px (5vw = 40px) to 1280px. */
  const { tokens, resolved } = run({
    text: { $type: 'dimension', h: { $value: { value: 2.5, unit: 'rem' }, $extensions: { [NS]: { fluid: { max: { value: 4, unit: 'rem' }, range: [800, 1280] } } } } },
  });
  assert.equal(cssValue(tokens.get('text.h'), resolved.get('text.h')), 'clamp(2.5rem, 0rem + 5vw, 4rem)');
  const bad = run({ text: { $type: 'dimension', h: { $value: { value: 1, unit: 'rem' }, $extensions: { [NS]: { fluid: { max: { value: 2, unit: 'rem' }, range: [900, 400] } } } } } });
  assert.ok(bad.errors.some((e) => e.includes('fluid.range')));
});

test('a later file overrides one token without restating its group', () => {
  const dir = project();
  const config = loadConfig(dir);
  const sys = loadSystem(config);
  assert.deepEqual(sys.errors, []);
  assert.equal(sys.base.resolved.get('spacing.md').value.value, 1);
  assert.equal(sys.base.tokens.get('color.link').source, config.tokenFiles[1]);
});

test('a second theme becomes light-dark(), and may only change colours', () => {
  const dark = { color: { $type: 'color', bg: { $value: '{color.neutral-950}', $description: 'Page.' } } };
  const dir = project({ css: { 'design/dark.tokens.json': JSON.stringify(dark) }, config: { themes: { dark: ['design/dark.tokens.json'] } } });
  const sys = loadSystem(loadConfig(dir));
  assert.deepEqual(sys.errors, []);
  assert.match(renderCss(sys), /--color-bg: light-dark\(var\(--color-neutral-50\), var\(--color-neutral-950\)\);/);
  assert.match(renderCss(sys), /color-scheme: light dark;/);

  const bad = { spacing: { $type: 'dimension', md: { $value: { value: 2, unit: 'rem' }, $description: 'x' } } };
  const dir2 = project({ css: { 'design/dark.tokens.json': JSON.stringify(bad) }, config: { themes: { dark: ['design/dark.tokens.json'] } } });
  assert.ok(loadSystem(loadConfig(dir2)).errors.some((e) => e.includes('only colours change per theme')));
});

test('reduced motion zeroes every duration and --motion, in both outputs', () => {
  const sys = loadSystem(loadConfig(project()));
  for (const out of [renderCss(sys), renderTailwind(sys)]) {
    const block = out.slice(out.indexOf('prefers-reduced-motion'));
    for (const name of ['fast', 'base', 'slow']) assert.match(block, new RegExp(`--duration-${name}: 0ms;`));
    assert.match(block, /--motion: 0;/);
  }
});

test('Tailwind output clears Tailwind\'s palette and declares the roles in @theme', () => {
  const out = renderTailwind(loadSystem(loadConfig(project())));
  assert.match(out, /@theme static \{\n {2}--color-\*: initial;/);
  assert.match(out, /--color-action: var\(--color-brand-700\);/);
});

test('Claude Design output is list-shaped with literal values only', () => {
  const json = JSON.parse(renderClaudeDesign(loadSystem(loadConfig(project())), 'Test'));
  assert.ok(Array.isArray(json.color.tokens) && json.color.tokens.length > 30);
  for (const t of json.color.tokens) {
    assert.match(t.name, /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/);
    assert.match(t.value, /^#[0-9a-f]{6}([0-9a-f]{2})?$/);
  }
  for (const s of json.type.groups[0].styles) assert.match(s.fontSize, /^[\d.]+(rem|px)$/);
});

test('the template brand needs nothing to build', () => {
  assert.ok(templateBrand().color.bg);
  assert.deepEqual(loadSystem(loadConfig(project())).errors, []);
});
