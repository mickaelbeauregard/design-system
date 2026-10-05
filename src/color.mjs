/**
 * Colour maths: sRGB, OKLCH, WCAG 2 contrast, and the tone scale.
 *
 * Every colour inside the system is { r, g, b, alpha } with channels 0..1 in
 * sRGB. OKLCH is used for one job: generating a tone scale whose steps look
 * evenly spaced, which HSL cannot do (an HSL yellow and blue at the same
 * "lightness" are nowhere near each other to the eye).
 *
 * Matrices are Björn Ottosson's, from the OKLab definition.
 */

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function parseHex(hex) {
  const m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(hex).trim());
  if (!m) return null;
  let h = m[1];
  if (h.length <= 4) h = [...h].map((c) => c + c).join('');
  const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), alpha: h.length === 8 ? n(6) : 1 };
}

export function toHex({ r, g, b, alpha = 1 }) {
  const byte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${byte(r)}${byte(g)}${byte(b)}${alpha < 1 ? byte(alpha) : ''}`;
}

export function toOklch({ r, g, b, alpha = 1 }) {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  /* Hue is meaningless without chroma; 0 keeps greys stable instead of letting
     float noise pick a random hue for the whole generated scale. */
  const H = C < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c: C, h: H, alpha };
}

/** Unclamped: the result may fall outside sRGB. Use inGamut / clampChroma. */
function oklchToRgbRaw({ l: L, c: C, h: H }) {
  const rad = (H * Math.PI) / 180;
  const A = C * Math.cos(rad);
  const B = C * Math.sin(rad);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

const EPS = 1e-6;
const inGamut = ({ r, g, b }) => [r, g, b].every((v) => v >= -EPS && v <= 1 + EPS);

/** The nearest in-gamut colour at the same lightness and hue: chroma comes
 *  down until sRGB can show it. Clipping channels instead shifts the hue. */
export function fromOklch({ l, c, h, alpha = 1 }) {
  let rgb = oklchToRgbRaw({ l, c, h });
  if (!inGamut(rgb)) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgbRaw({ l, c: mid, h }))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToRgbRaw({ l, c: lo, h });
  }
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return { r: clamp(rgb.r), g: clamp(rgb.g), b: clamp(rgb.b), alpha };
}

export function formatOklch({ l, c, h, alpha = 1 }) {
  const round = (v, d) => Number(v.toFixed(d));
  const a = alpha < 1 ? ` / ${round(alpha, 3)}` : '';
  return `oklch(${round(l * 100, 2)}% ${round(c, 4)} ${round(h, 2)}${a})`;
}

/** WCAG 2 relative luminance. */
export function luminance({ r, g, b }) {
  const [R, G, B] = [r, g, b].map(toLinear);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** A translucent colour composited over an opaque one, in sRGB, the way a
 *  browser paints it. */
export function over(fg, bg) {
  const a = fg.alpha ?? 1;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    alpha: 1,
  };
}

export function contrast(fg, bg) {
  const solidFg = (fg.alpha ?? 1) < 1 ? over(fg, bg) : fg;
  const [hi, lo] = [luminance(solidFg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Eleven steps from one seed, at fixed OKLCH lightness so that step 600 of a
 * green and step 600 of a red carry the same weight on the page. Chroma follows
 * the seed and tapers at both ends, where sRGB has no room for it anyway.
 *
 * The lightness targets are tuned so that white text passes AA on 600 and
 * darker, and 600-and-darker text passes AA on 50 and 100 — the pairings the
 * role contract leans on — for every hue. Green is the tight one: WCAG
 * weighs it heaviest, and 600 at L 0.52 left a saturated green at 4.44:1.
 * test/color.test.mjs sweeps the hue wheel to hold this.
 */
export const SCALE = [
  [50, 0.975, 0.12],
  [100, 0.945, 0.22],
  [200, 0.89, 0.42],
  [300, 0.81, 0.66],
  [400, 0.7, 0.88],
  [500, 0.6, 1],
  [600, 0.5, 1],
  [700, 0.43, 0.92],
  [800, 0.36, 0.78],
  [900, 0.28, 0.62],
  [950, 0.21, 0.5],
];

export function toneScale(seed) {
  const { c, h } = toOklch(seed);
  return SCALE.map(([step, l, k]) => {
    const rgb = fromOklch({ l, c: c * k, h });
    return { step, rgb, oklch: toOklch(rgb) };
  });
}
