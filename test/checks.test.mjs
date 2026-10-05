/**
 * Every check, made to fail on purpose. A guard that has only ever reported
 * clean has not been shown to read anything; both guards in the project this
 * was extracted from had false negatives that only this kind of test found.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { project, check, failing, templateBrand } from './helpers.mjs';

const only = (id, css, extra = {}) => {
  const results = check(project({ css: { 'style.css': css }, ...extra }));
  assert.deepEqual(failing(results), [id], `expected only ${id} to fail, got ${failing(results).join(', ') || 'none'}`);
  return results[id].violations;
};

test('a clean stylesheet passes everything', () => {
  const css = `.a { color: var(--color-text); padding: var(--spacing-md) 0; border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm); transition: color var(--duration-fast) var(--ease-standard); font-size: var(--text-ui); }
    @media (min-width: 48rem) { .a { gap: calc(var(--spacing-md) - 1px); } }
    .b { background: transparent; border: 1px solid currentColor; }`;
  assert.deepEqual(failing(check(project({ css: { 'style.css': css } }))), []);
});

test('DS-0100 catches hex, functions and named colours, in values that span lines', () => {
  const v = only('DS-0100', `.a { color: #fff; }\n.b { background: rgb(0 0 0 / 50%); }\n.c { border-color: white; }\n.d { background:\n  linear-gradient(\n    red,\n    oklch(50% 0.1 140)); }`);
  /* One report per declaration, at the line it starts on, naming every literal
     in it — the gradient's two sit on lines with no colon at all. */
  assert.deepEqual(v.map((x) => x.line), [1, 2, 3, 4]);
  assert.match(v[3].message, /red, oklch\(/);
});

test('DS-0100 also catches a literal in :root: colours belong in the token files', () => {
  only('DS-0100', ':root { --brand: #123456; }');
});

test('DS-0100 is not fooled by comments, url(), strings or variable names', () => {
  const css = `/* the old #fff surface */ .a { background: url(white.svg); content: "red"; color: var(--color-red-500); white-space: nowrap; }`;
  assert.deepEqual(failing(check(project({ css: { 'style.css': css } }))), []);
});

test('DS-0100 reads markup for Tailwind arbitrary colours and inline colours', () => {
  const results = check(project({ markup: { 'src/App.jsx': '<div className="bg-[#ff0000] p-4" style={{ color: "#333" }} />' } }));
  assert.deepEqual(failing(results), ['DS-0100']);
  assert.equal(results['DS-0100'].violations.length, 2);
});

test('DS-0101 !important', () => only('DS-0101', '.a { display: none !important; }'));

test('DS-0102 type off the ramp: a size, a family, the shorthand', () => {
  const v = only('DS-0102', '.a { font-size: 17px; }\n.b { font-family: Georgia, serif; }\n.c { font: 1rem/1.5 serif; }');
  assert.equal(v.length, 3);
});

test('DS-0102 leaves @font-face and inherit alone', () => {
  const css = '@font-face { font-family: "Inter"; src: url(/inter.woff2); }\n.a { font: inherit; font-size: inherit; }';
  assert.deepEqual(failing(check(project({ css: { 'style.css': css } }))), []);
});

test('DS-0103 every way of making the phone the exception', () => {
  const v = only('DS-0103', '@media (max-width: 768px) {}\n@media (width < 769px) {}\n@media not all and (min-width: 769px) {}\n@container (max-inline-size: 30rem) {}');
  assert.equal(v.length, 4);
});

test('DS-0103 reads media attributes in markup', () => {
  const results = check(project({ markup: { 'index.html': '<source media="(max-width: 600px)" srcset="a.png">' } }));
  assert.deepEqual(failing(results), ['DS-0103']);
});

test('DS-0104 every spelling that removes a focus ring', () => {
  const v = only('DS-0104', '.a { outline: none; }\n.b { outline: 0; }\n.c { outline-width: 0px; }\n.d { outline-style: none; }\n.e { outline-color: transparent; }');
  assert.equal(v.length, 5);
});

test('DS-0104 allows the :not(:focus-visible) pattern', () => {
  assert.deepEqual(failing(check(project({ css: { 'style.css': '.a:focus:not(:focus-visible) { outline: none; }' } }))), []);
});

test('DS-0105 a hand-written shadow', () => only('DS-0105', '.a { box-shadow: 0 2px 4px var(--color-shadow); }'));

test('DS-0106 a literal radius, and 50% too', () => {
  const v = only('DS-0106', '.a { border-radius: 6px; }\n.b { border-top-left-radius: 50%; }');
  assert.equal(v.length, 2);
});

test('DS-0107 a literal duration or delay', () => {
  const v = only('DS-0107', '.a { transition: opacity 200ms ease; }\n.b { animation-delay: .5s; }');
  assert.equal(v.length, 2);
});

test('DS-0108 a literal margin, padding or gap; hairlines allowed', () => {
  const v = only('DS-0108', '.a { margin: 12px auto; }\n.b { gap: 1.5rem; }\n.c { padding: 1px var(--spacing-sm); }');
  assert.equal(v.length, 2);
});

test('an allowance with a reason excuses that rule on that line only', () => {
  const css = '/* ds-allow DS-0108: the hero overlaps the band by design */\n.a { margin-top: -3rem; }\n.b { margin-top: -3rem; }';
  const v = only('DS-0108', css);
  assert.deepEqual(v.map((x) => x.line), [3]);
});

test('DS-0004 an allowance without a reason does not count, and is reported', () => {
  const results = check(project({ css: { 'style.css': '.a { margin: 3px; } /* ds-allow DS-0108 */' } }));
  assert.deepEqual(failing(results).sort(), ['DS-0004']);
  const results2 = check(project({ css: { 'style.css': '.a { margin: 3px; } /* ds-allow */' } }));
  assert.deepEqual(failing(results2).sort(), ['DS-0004', 'DS-0108']);
});

test('DS-0001 a missing role', () => {
  const brand = templateBrand();
  delete brand.color['focus'];
  assert.deepEqual(failing(check(project({ brand }))), ['DS-0001']);
});

test('DS-0002 a token without a $description', () => {
  const brand = templateBrand();
  delete brand.color.link.$description;
  assert.deepEqual(failing(check(project({ brand }))), ['DS-0002']);
});

test('DS-0003 an alias to nothing, and the checks that need tokens step aside', () => {
  const brand = templateBrand();
  brand.color.link.$value = '{color.nope}';
  const results = check(project({ brand }));
  assert.deepEqual(failing(results), ['DS-0003']);
  assert.ok(results['DS-0109'].skipped);
});

test('DS-0109 a pairing under AA, named with its ratio and theme', () => {
  const brand = templateBrand();
  brand.color['text-muted'].$value = '{color.neutral-400}';
  const results = check(project({ brand }));
  assert.deepEqual(failing(results), ['DS-0109']);
  assert.match(results['DS-0109'].violations[0].message, /^light: color\.text-muted on color\.bg is \d\.\d\d:1, needs 4\.5:1$/);
});

test('DS-0109 measures a project\'s own pairs too', () => {
  const results = check(project({ config: { check: { css: [], off: {}, pairs: [{ fg: 'color.neutral-300', bg: 'color.bg' }] } } }));
  assert.deepEqual(failing(results), ['DS-0109']);
});

test('DS-0110 a generated file that no longer matches its tokens', () => {
  const dir = project({ config: { out: { css: 'design/tokens.css' } } });
  writeFileSync(join(dir, 'design/tokens.css'), ':root {}');
  assert.deepEqual(failing(check(dir)), ['DS-0110']);
});

test('the generated file is never itself checked', () => {
  const dir = project({ config: { out: { css: 'design/tokens.css' } } });
  assert.deepEqual(failing(check(dir)), ['DS-0110']); // missing, not 'full of literals'
});

test('a rule turned off needs a reason, and is reported as off', () => {
  assert.throws(() => check(project({ config: { check: { off: { 'DS-0108': true } } } })), /needs a reason/);
  const results = check(project({ css: { 'style.css': '.a { margin: 3px; }' }, config: { check: { css: ['**/*.css'], off: { 'DS-0108': 'legacy layout, migrating in ADR-0009' }, pairs: [] } } }));
  assert.deepEqual(failing(results), []);
  assert.equal(results['DS-0108'].skipped, 'legacy layout, migrating in ADR-0009');
});
