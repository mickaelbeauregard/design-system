/**
 * Reading W3C design tokens (DTCG Format Module 2025.10).
 *
 * Files are deep-merged in order — the system's core first, then the project's
 * brand — so a brand overrides a value without restating the group around it.
 * Every token gets a CSS name from its path: `color.text-muted` is
 * `--color-text-muted`. The group names are chosen to match Tailwind v4's theme
 * namespaces (`color`, `font`, `text`, `radius`, `shadow`, `spacing`, `ease`),
 * so the same names work with and without Tailwind.
 *
 * Two extensions, under NS, cover what the format cannot say (ADR-0001):
 *   alpha  on a colour alias: the aliased colour at that opacity. Emitted as
 *          color-mix() so a tint follows its source instead of freezing a copy.
 *   fluid  on a dimension: { max, range? } — $value is the phone size, max the
 *          wide one, emitted as clamp(). It grows across range, [px, px],
 *          360–1280 unless a brand keeps a size it already had.
 *          lineHeight on a text size pairs it.
 *   scale  on a colour: generate an eleven-step OKLCH tone scale from it.
 */
import { readFileSync } from 'node:fs';
import { fromOklch, parseHex, toneScale, toOklch, formatOklch, toHex } from './color.mjs';

export const NS = 'io.github.mickaelbeauregard.ds';

const isGroup = (node) => node && typeof node === 'object' && !Array.isArray(node) && !('$value' in node);

export class TokenError extends Error {}

/** Deep-merge token files. Returns the tree and which file last set each token. */
export function loadTree(files) {
  const tree = {};
  const origin = new Map();
  for (const file of files) {
    let json;
    try {
      json = JSON.parse(readFileSync(file, 'utf8'));
    } catch (err) {
      throw new TokenError(`${file}: ${err.code === 'ENOENT' ? 'not found' : err.message}`);
    }
    merge(tree, json, [], file, origin);
  }
  return { tree, origin };
}

function merge(into, from, path, file, origin) {
  for (const [key, value] of Object.entries(from)) {
    if (key.startsWith('$')) {
      into[key] = structuredClone(value);
    } else if (isGroup(value) && isGroup(into[key])) {
      merge(into[key], value, [...path, key], file, origin);
    } else {
      /* A token is replaced whole, never field by field: a brand that keeps the
         core's $description under its own $value would describe a colour it
         no longer is. */
      into[key] = structuredClone(value);
      markOrigin(value, [...path, key], file, origin);
    }
  }
}

function markOrigin(node, path, file, origin) {
  if (!isGroup(node)) return origin.set(path.join('.'), file);
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) markOrigin(v, [...path, k], file, origin);
}

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

/** Every token in the tree, keyed by dotted path, $type inherited from groups. */
export function flatten({ tree, origin }) {
  const tokens = new Map();
  const errors = [];
  const walk = (node, path, inheritedType) => {
    const type = node.$type ?? inheritedType;
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) continue;
      const childPath = [...path, key];
      const dotted = childPath.join('.');
      if (!SEGMENT.test(key)) {
        errors.push(`${dotted}: a name is lowercase letters, digits and hyphens, so it can become a CSS variable`);
        continue;
      }
      if (isGroup(child)) {
        walk(child, childPath, type);
        continue;
      }
      const token = {
        path: dotted,
        name: childPath.join('-'),
        type: child.$type ?? type,
        raw: child.$value,
        description: child.$description,
        ext: child.$extensions?.[NS] ?? {},
        source: origin.get(dotted),
      };
      if (!token.type) errors.push(`${dotted}: no $type on the token or any group above it`);
      tokens.set(dotted, token);
      if (token.type === 'color' && token.ext.scale) expandScale(token, tokens, errors);
    }
  };
  walk(tree, [], undefined);
  return { tokens, errors };
}

function expandScale(seed, tokens, errors) {
  const color = parseColor(seed.raw);
  if (!color) {
    errors.push(`${seed.path}: "scale" needs a literal seed colour, not an alias`);
    return;
  }
  for (const { step, rgb, oklch } of toneScale(color)) {
    const path = `${seed.path}-${step}`;
    tokens.set(path, {
      path,
      name: `${seed.name}-${step}`,
      type: 'color',
      raw: { colorSpace: 'oklch', components: [oklch.l, oklch.c, oklch.h] },
      description: `Step ${step} of the ${seed.name} scale, generated from the seed.`,
      ext: {},
      source: seed.source,
      generated: { rgb, css: formatOklch(oklch) },
    });
  }
}

const ALIAS = /^\{([^{}]+)\}$/;
export const aliasOf = (raw) => (typeof raw === 'string' ? ALIAS.exec(raw)?.[1] : undefined);

/* ---- literal parsers ------------------------------------------------- */

export function parseColor(raw) {
  if (typeof raw === 'string') {
    const c = parseHex(raw);
    return c && { ...c, css: raw.toLowerCase() };
  }
  if (!raw || typeof raw !== 'object') return null;
  const { colorSpace, components, alpha = 1, hex } = raw;
  if (!Array.isArray(components) || components.length !== 3) return null;
  if (colorSpace === 'srgb') {
    const [r, g, b] = components;
    const rgb = { r, g, b, alpha };
    return { ...rgb, css: hex ? withAlpha(hex, alpha) : toHex(rgb) };
  }
  if (colorSpace === 'oklch') {
    const [l, c, h] = components;
    return { ...fromOklch({ l, c, h, alpha }), css: formatOklch({ l, c, h, alpha }) };
  }
  return null;
}

const withAlpha = (hex, alpha) => (alpha < 1 ? toHex({ ...parseHex(hex), alpha }) : hex.toLowerCase());

const UNITS = { dimension: ['px', 'rem'], duration: ['ms', 's'] };

function parseUnitValue(raw, type) {
  if (raw && typeof raw === 'object' && typeof raw.value === 'number' && UNITS[type].includes(raw.unit)) return raw;
  return null;
}

const WEIGHTS = { thin: 100, hairline: 100, 'extra-light': 200, light: 300, normal: 400, regular: 400, book: 400, medium: 500, 'semi-bold': 600, bold: 700, 'extra-bold': 800, black: 900, heavy: 900 };

function parseLiteral(type, raw) {
  switch (type) {
    case 'color':
      return parseColor(raw);
    case 'dimension':
    case 'duration':
      return parseUnitValue(raw, type);
    case 'number':
      return typeof raw === 'number' ? raw : null;
    case 'fontFamily':
      return typeof raw === 'string' ? [raw] : Array.isArray(raw) && raw.every((f) => typeof f === 'string') ? raw : null;
    case 'fontWeight':
      return typeof raw === 'number' ? raw : WEIGHTS[raw] ?? null;
    case 'cubicBezier':
      return Array.isArray(raw) && raw.length === 4 && raw.every((n) => typeof n === 'number') ? raw : null;
    default:
      return null;
  }
}

/* ---- resolution ------------------------------------------------------ */

/**
 * Resolve every token to a literal. Aliases are followed (and kept, so CSS can
 * still say var(--target)); a missing target, a type mismatch or a cycle is an
 * error naming the token, not a crash.
 */
export function resolve(tokens) {
  const resolved = new Map();
  const errors = [];

  const literalOf = (path, stack = []) => {
    if (resolved.has(path)) return resolved.get(path).value;
    const token = tokens.get(path);
    if (stack.includes(path)) throw new TokenError(`${stack[0]}: alias cycle ${[...stack, path].join(' → ')}`);
    const target = aliasOf(token.raw);
    let value;
    if (target) {
      const to = tokens.get(target);
      if (!to) throw new TokenError(`${path}: aliases {${target}}, which does not exist`);
      if (to.type !== token.type) throw new TokenError(`${path}: a ${token.type} cannot alias {${target}}, a ${to.type}`);
      value = literalOf(target, [...stack, path]);
      if (token.type === 'color' && token.ext.alpha !== undefined) {
        value = { ...value, alpha: (value.alpha ?? 1) * token.ext.alpha };
      }
    } else if (token.generated) {
      value = { ...token.generated.rgb, css: token.generated.css };
    } else if (token.type === 'shadow') {
      value = parseShadow(token, (alias) => literalOf(alias, [...stack, path]));
    } else {
      value = parseLiteral(token.type, token.raw);
      if (value === null) throw new TokenError(`${path}: ${JSON.stringify(token.raw)} is not a valid ${token.type}`);
    }
    if (token.type === 'dimension' && token.ext.fluid) {
      const max = parseUnitValue(token.ext.fluid.max, 'dimension');
      if (!max) throw new TokenError(`${path}: fluid.max must be a dimension like {"value": 2, "unit": "rem"}`);
      const range = token.ext.fluid.range;
      if (range !== undefined && !(Array.isArray(range) && range.length === 2 && range[0] < range[1] && range.every((n) => typeof n === 'number'))) {
        throw new TokenError(`${path}: fluid.range must be [narrowest px, widest px]`);
      }
      value = { ...value, fluidMax: max, fluidRange: range };
    }
    resolved.set(path, { value, alias: target });
    return value;
  };

  for (const path of tokens.keys()) {
    try {
      literalOf(path);
    } catch (err) {
      if (!(err instanceof TokenError)) throw err;
      errors.push(err.message);
    }
  }
  return { resolved, errors };
}

function parseShadow(token, literalOfAlias) {
  const layers = Array.isArray(token.raw) ? token.raw : [token.raw];
  return layers.map((layer) => {
    if (!layer || typeof layer !== 'object') throw new TokenError(`${token.path}: a shadow layer is an object`);
    const dim = (key) => {
      const v = parseUnitValue(layer[key] ?? { value: 0, unit: 'px' }, 'dimension');
      if (!v) throw new TokenError(`${token.path}: shadow ${key} must be a dimension`);
      return v;
    };
    const colorAlias = aliasOf(layer.color);
    const color = colorAlias ? literalOfAlias(colorAlias) : parseColor(layer.color);
    if (!color) throw new TokenError(`${token.path}: shadow color must be a colour or an alias of one`);
    return {
      color,
      colorAlias,
      offsetX: dim('offsetX'),
      offsetY: dim('offsetY'),
      blur: dim('blur'),
      spread: dim('spread'),
      inset: layer.inset === true,
    };
  });
}

/* Re-exported for the build, which formats generated scale steps for Claude
   Design as hex rather than oklch(). */
export { toHex, toOklch };
