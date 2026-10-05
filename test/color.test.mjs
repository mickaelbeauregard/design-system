import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHex, toHex, toOklch, fromOklch, contrast, toneScale, over } from '../src/color.mjs';

test('hex round-trips, short and long, with alpha', () => {
  assert.equal(toHex(parseHex('#2F3A2E')), '#2f3a2e');
  assert.equal(toHex(parseHex('#abc')), '#aabbcc');
  assert.equal(toHex(parseHex('#11223380')), '#11223380');
  assert.equal(parseHex('not a colour'), null);
});

test('WCAG contrast: black on white is 21, a colour on itself is 1', () => {
  assert.equal(contrast(parseHex('#000'), parseHex('#fff')).toFixed(2), '21.00');
  assert.equal(contrast(parseHex('#777'), parseHex('#777')), 1);
  /* A published reference pair: #767676 on white is the classic 4.54:1. */
  assert.equal(contrast(parseHex('#767676'), parseHex('#fff')).toFixed(2), '4.54');
});

test('a translucent foreground is measured where it lands', () => {
  const half = { ...parseHex('#000'), alpha: 0.5 };
  const blended = over(half, parseHex('#fff'));
  assert.equal(toHex(blended), '#808080');
  assert.ok(contrast(half, parseHex('#fff')) < contrast(parseHex('#000'), parseHex('#fff')));
});

test('OKLCH round-trips through sRGB within one step of 255', () => {
  for (const hex of ['#2f3a2e', '#a85a33', '#faf6ec', '#2563eb', '#000000', '#ffffff']) {
    assert.equal(toHex(fromOklch(toOklch(parseHex(hex)))), hex);
  }
});

test('out-of-gamut OKLCH comes back in gamut at the same lightness', () => {
  const c = fromOklch({ l: 0.7, c: 0.4, h: 145 });
  for (const v of [c.r, c.g, c.b]) assert.ok(v >= 0 && v <= 1);
  assert.ok(Math.abs(toOklch(c).l - 0.7) < 0.01);
});

/* The promise the role contract leans on, held across the whole hue wheel and
   both a muted and a saturated seed. */
test('every scale: white text passes AA on 600 and darker, and 600+ passes on 50 and 100', () => {
  const white = parseHex('#ffffff');
  for (let h = 0; h < 360; h += 15) {
    for (const c of [0.02, 0.08, 0.15, 0.25]) {
      const steps = Object.fromEntries(toneScale(fromOklch({ l: 0.55, c, h })).map((s) => [s.step, s.rgb]));
      for (const step of [600, 700, 800, 900, 950]) {
        assert.ok(contrast(white, steps[step]) >= 4.5, `white on ${step} at hue ${h}, chroma ${c}`);
        assert.ok(contrast(steps[step], steps[50]) >= 4.5, `${step} on 50 at hue ${h}, chroma ${c}`);
        assert.ok(contrast(steps[step], steps[100]) >= 4.5, `${step} on 100 at hue ${h}, chroma ${c}`);
      }
    }
  }
});

test('scale lightness falls step by step', () => {
  const steps = toneScale(parseHex('#2b5f75')).map((s) => s.oklch.l);
  steps.reduce((prev, l) => (assert.ok(l < prev), l));
});
