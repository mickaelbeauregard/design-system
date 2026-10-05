/**
 * The checks behind `ds check`. Each one is a rule in docs/RULES.md, with its
 * Why there; test/rules-catalogue.test.mjs fails if the two disagree.
 *
 * A check returns violations: { file, line, message }. File and line are
 * omitted for a check about the token set as a whole.
 *
 * A single line can be excused with a comment on it or on the line above:
 *   /* ds-allow DS-0100: the mask needs an opaque literal *\/
 * naming the rule and giving a reason. DS-0004 holds every allowance to that.
 */
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { walk, inTokenBlock, inFontFace } from './css.mjs';
import { expand } from './files.mjs';
import { contrast, over } from './color.mjs';
import { ROLES, PAIRS } from './contract.mjs';
import { CORE_TOKENS } from './config.mjs';
import { renderCss, renderTailwind, renderClaudeDesign } from './build.mjs';

/* ---- shared scanning helpers ----------------------------------------- */

const NAMED_COLORS =
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' ');

const COLOR_LITERAL = new RegExp(
  [
    '#[0-9a-fA-F]{3,8}\\b',
    '\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\(',
    `(?<![\\w-])(?:${NAMED_COLORS.join('|')})(?![\\w-])`,
  ].join('|'),
  'gi'
);

/** The value with url(), strings and var() names removed: `url(white.svg)`
 *  and `var(--color-red-500)` both contain a colour's name and neither is one. */
const scrub = (value) =>
  value
    .replace(/url\([^)]*\)/gi, 'url()')
    .replace(/"[^"]*"|'[^']*'/g, '""')
    .replace(/var\(\s*--[\w-]+/g, 'var(');

/** Remove every var(…), nested ones included, to see what is left beside them. */
function stripVars(value) {
  let out = value;
  for (let prev = null; prev !== out; ) {
    prev = out;
    out = out.replace(/var\([^()]*(\([^()]*\))*[^()]*\)/g, '');
  }
  return out;
}

const LENGTH = /(?<![\w-])-?\d*\.?\d+(px|rem|em|vw|vh|vi|vb|vmin|vmax|svh|lvh|dvh|ch|ex|lh|rlh|cm|mm|in|pt|pc)\b/g;
const TIME = /(?<![\w-])\d*\.?\d+m?s\b/g;
const OUTLINE_REMOVED = /^(none|0(px|em|rem)?)$/;

function allowances(rawLines, id) {
  return (line) => {
    const here = rawLines[line - 1] ?? '';
    const above = rawLines[line - 2] ?? '';
    const re = new RegExp(`ds-allow\\s+${id}\\b`);
    return re.test(here) || re.test(above);
  };
}

/* ---- the checks ------------------------------------------------------- */

const declarationCheck = (id, what, test) => ({
  id,
  what,
  run: ({ css }) =>
    css.flatMap(({ file, walked, rawLines }) => {
      const allowed = allowances(rawLines, id);
      return walked.declarations.flatMap((d) => {
        const message = test(d);
        return message && !allowed(d.line) ? [{ file, line: d.line, message }] : [];
      });
    }),
});

export const CHECKS = [
  {
    id: 'DS-0001',
    what: 'every role in the contract is defined',
    needsSystem: true,
    run: ({ system }) =>
      Object.keys(ROLES)
        .filter((path) => !system.base.tokens.has(path))
        .map((path) => ({ message: `${path} is missing — ${ROLES[path]}` })),
  },
  {
    id: 'DS-0002',
    what: 'every token says what it is for',
    needsSystem: true,
    run: ({ system, config }) =>
      [...system.base.tokens.values()]
        .filter((t) => !t.description?.trim())
        .map((t) => ({ file: rel(config, t.source), message: `${t.path} has no $description` })),
  },
  {
    id: 'DS-0003',
    what: 'the token files are valid',
    run: ({ systemErrors }) => systemErrors.map((message) => ({ message })),
  },
  {
    id: 'DS-0004',
    what: 'an allowance names its rule and gives a reason',
    run: ({ css }) =>
      css.flatMap(({ file, rawLines }) =>
        rawLines.flatMap((text, i) => {
          if (!/ds-allow/.test(text)) return [];
          const ok = /ds-allow\s+DS-\d{4}\s*:?\s*\S.{9,}/.test(text.replace(/\*\/.*$/, ''));
          return ok ? [] : [{ file, line: i + 1, message: 'write `ds-allow DS-XXXX: why this line is the exception`' }];
        })
      ),
  },
  {
    id: 'DS-0100',
    what: 'colours live in the token files, nowhere else',
    run: ({ css, markup }) => [
      ...css.flatMap(({ file, walked, rawLines }) => {
        const allowed = allowances(rawLines, 'DS-0100');
        return walked.declarations.flatMap((d) => {
          const found = scrub(d.value).match(COLOR_LITERAL);
          return found && !allowed(d.line)
            ? [{ file, line: d.line, message: `${d.property}: ${found.join(', ')} — use a colour role, var(--color-…)` }]
            : [];
        });
      }),
      ...markup.flatMap(({ file, src }) =>
        src.split('\n').flatMap((text, i) => {
          const arbitrary = text.match(/-\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch)\()/g) ?? [];
          const inline = text.match(/(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*['"]?(?:#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?|oklch)\()/gi) ?? [];
          return [...arbitrary, ...inline].map((found) => ({ file, line: i + 1, message: `${found} — use a colour role` }));
        })
      ),
    ],
  },
  declarationCheck('DS-0101', 'no !important', (d) => (/!\s*important/i.test(d.value) ? `${d.property} is !important — fix the selector or the layer` : null)),
  declarationCheck('DS-0102', 'type comes from the ramp and the family tokens', (d) => {
    if (inTokenBlock(d.context) || inFontFace(d.context)) return null;
    const v = d.value.trim();
    if (d.property === 'font-size' || d.property === 'font-family') {
      return v.startsWith('var(') || v === 'inherit' ? null : `${d.property}: ${v} — use var(--text-…) / var(--font-…)`;
    }
    if (d.property === 'font') return v === 'inherit' ? null : `font: ${v} — the shorthand may only inherit`;
    return null;
  }),
  {
    id: 'DS-0103',
    what: 'breakpoints are min-width — the phone is the base',
    run: ({ css, markup }) => [
      ...css.flatMap(({ file, walked, rawLines }) => {
        const allowed = allowances(rawLines, 'DS-0103');
        return walked.blocks
          .filter((b) => /^@(media|container)\b/.test(b.prelude) && /max-(width|inline-size)|(width|inline-size)\s*<=?|<=?\s*(width|inline-size)|\bnot\b/.test(b.prelude))
          .filter((b) => !allowed(b.line))
          .map((b) => ({ file, line: b.line, message: `${b.prelude} — write the phone value as the base and add a min-width query` }));
      }),
      ...markup.flatMap(({ file, src }) =>
        src.split('\n').flatMap((text, i) =>
          /\smedia=["'][^"']*(max-width|width\s*<|\bnot\b)/.test(text) ? [{ file, line: i + 1, message: 'a max-width media attribute' }] : []
        )
      ),
    ],
  },
  declarationCheck('DS-0104', 'a focus indicator is never removed', (d) => {
    if (d.context.some((p) => /:not\(:focus-visible\)/.test(p))) return null;
    const v = d.value.trim().toLowerCase();
    if ((d.property === 'outline' || d.property === 'outline-width') && OUTLINE_REMOVED.test(v)) return `${d.property}: ${v} removes the focus ring — style :focus-visible instead`;
    if (d.property === 'outline-style' && v === 'none') return 'outline-style: none removes the focus ring';
    if (d.property === 'outline-color' && v === 'transparent') return 'outline-color: transparent hides the focus ring';
    return null;
  }),
  /* Radius and shadow read any variable, not only --radius-* / --shadow-*: a
     component exposes --button-shadow so a variant can re-point it, and that
     variable is itself set from a token. What they may not hold is a literal. */
  declarationCheck('DS-0105', 'shadows come from the shadow tokens', (d) => {
    if (d.property !== 'box-shadow' || inTokenBlock(d.context)) return null;
    const rest = stripVars(d.value).replace(/\b(none|inherit|inset)\b|,/g, '').trim();
    return rest ? `box-shadow: ${d.value} — use var(--shadow-…)` : null;
  }),
  declarationCheck('DS-0106', 'corner radii come from the radius tokens', (d) => {
    if (!/^border(-[a-z]+)*-radius$/.test(d.property) || inTokenBlock(d.context)) return null;
    const rest = stripVars(d.value).replace(/(?<![\d.])0(?![\d.%a-z])|\binherit\b|\//g, '').trim();
    return rest ? `${d.property}: ${d.value} — use var(--radius-…)` : null;
  }),
  declarationCheck('DS-0107', 'motion timing comes from the duration tokens', (d) => {
    if (!/^(transition|animation)(-duration|-delay)?$/.test(d.property) || inTokenBlock(d.context)) return null;
    const found = stripVars(scrub(d.value)).match(TIME);
    return found ? `${d.property}: ${found.join(', ')} — use var(--duration-…), which reduced motion sets to 0` : null;
  }),
  declarationCheck('DS-0108', 'spacing comes from the spacing tokens', (d) => {
    if (!/^(margin|padding)(-[a-z-]+)?$|^(row-|column-)?gap$/.test(d.property) || inTokenBlock(d.context)) return null;
    const found = (stripVars(scrub(d.value)).match(LENGTH) ?? []).filter((l) => !/^-?[12]px$/.test(l) && !/^-?0[a-z]+$/.test(l));
    return found.length ? `${d.property}: ${found.join(', ')} — use var(--spacing-…)` : null;
  }),
  {
    id: 'DS-0109',
    what: 'every role pairing passes WCAG AA, in every theme',
    needsSystem: true,
    run: ({ system, config }) => {
      const out = [];
      const pairs = [...PAIRS, ...config.check.pairs.map((p) => ({ min: 4.5, ...p }))];
      for (const theme of system.themeNames) {
        const { resolved } = system.themes[theme];
        const page = resolved.get('color.bg')?.value;
        for (const { fg, bg, min } of pairs) {
          const f = resolved.get(fg)?.value;
          let b = resolved.get(bg)?.value;
          if (!f || !b || !page) continue; // a missing role is DS-0001's to report
          if ((b.alpha ?? 1) < 1) b = over(b, page);
          const ratio = contrast(f, b);
          if (ratio + 1e-9 < min) {
            out.push({ message: `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${min}:1` });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'DS-0110',
    what: 'the generated files match the tokens',
    needsSystem: true,
    run: ({ system, config }) => {
      const expected = {
        css: () => renderCss(system),
        tailwind: () => renderTailwind(system),
        claudeDesign: () => renderClaudeDesign(system, config.name),
      };
      return Object.entries(expected)
        .filter(([key]) => config.out[key])
        .flatMap(([key, render]) => {
          let actual = null;
          try {
            actual = readFileSync(config.out[key], 'utf8');
          } catch {
            /* missing is reported below */
          }
          return actual === render() ? [] : [{ file: rel(config, config.out[key]), message: `${actual === null ? 'missing' : 'out of date'} — run \`ds build\`` }];
        });
    },
  },
];

const rel = (config, file) => (file ? relative(config.cwd, file) || file : undefined);

/** Gather the files a project asks to be checked. Generated files are never
 *  checked: they are the token values, by definition. */
export function collect(config) {
  const generated = Object.values(config.out).map((f) => relative(config.cwd, f));
  const ignore = [...config.check.ignore, ...generated];
  const read = (file) => readFileSync(`${config.cwd}/${file}`, 'utf8');
  const css = expand(config.check.css, { cwd: config.cwd, ignore }).map((file) => {
    const src = read(file);
    return { file, src, rawLines: src.split('\n'), walked: walk(src) };
  });
  const markup = expand(config.check.markup, { cwd: config.cwd, ignore }).map((file) => ({ file, src: read(file) }));
  return { css, markup };
}

export function runChecks({ config, system, systemErrors }) {
  const { css, markup } = collect(config);
  const ctx = { config, system, systemErrors, css, markup };
  return CHECKS.map((check) => {
    if (config.check.off[check.id]) return { ...check, skipped: config.check.off[check.id], violations: [] };
    if (check.needsSystem && !system) return { ...check, skipped: 'the token files do not load (DS-0003)', violations: [] };
    return { ...check, violations: check.run(ctx) };
  });
}

export { CORE_TOKENS };
