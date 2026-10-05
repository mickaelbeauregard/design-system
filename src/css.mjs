/**
 * Just enough CSS parsing for the checks: comments blanked, then every
 * declaration with its line and the chain of selectors and at-rules around it.
 *
 * Comments are blanked rather than removed so line numbers stay true, and they
 * must go before anything is scanned: a comment documenting a rule quotes the
 * very thing the rule forbids. Strings are respected — `content: "/*"` once
 * opened a "comment" that swallowed the rest of a file and every check
 * reported clean on a stylesheet it never read.
 */

export function stripComments(src) {
  let out = '';
  let inComment = false;
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inComment) {
      if (c === '*' && src[i + 1] === '/') {
        inComment = false;
        out += '  ';
        i++;
      } else out += c === '\n' ? '\n' : ' ';
      continue;
    }
    if (quote) {
      if (c === '\\') {
        out += c + (src[i + 1] ?? '');
        i++;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      out += c;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      inComment = true;
      out += '  ';
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

/**
 * Walk a stylesheet. Returns
 *   declarations: { property, value, line, context: [prelude, …] }
 *   blocks:       { prelude, line, context }   every `prelude { … }`
 * Nesting (native CSS nesting, @media inside rules) is followed.
 */
export function walk(src) {
  const css = stripComments(src);
  const declarations = [];
  const blocks = [];
  const stack = [];
  let start = 0;
  let quote = null;
  let parens = 0;
  const lineAt = (() => {
    const starts = [0];
    for (let i = 0; i < css.length; i++) if (css[i] === '\n') starts.push(i + 1);
    return (index) => {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= index) lo = mid;
        else hi = mid - 1;
      }
      return lo + 1;
    };
  })();
  const firstNonSpace = (from, to) => {
    for (let i = from; i < to; i++) if (!/\s/.test(css[i])) return i;
    return from;
  };

  const flushDeclaration = (end) => {
    const text = css.slice(start, end);
    const colon = text.indexOf(':');
    if (colon > 0 && stack.length) {
      const property = text.slice(0, colon).trim();
      if (/^(--)?[a-zA-Z-]+$/.test(property)) {
        declarations.push({
          property: property.toLowerCase().startsWith('--') ? property : property.toLowerCase(),
          value: text.slice(colon + 1).trim(),
          line: lineAt(firstNonSpace(start, end)),
          context: [...stack],
        });
      }
    }
  };

  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '(') parens++;
    else if (c === ')') parens = Math.max(0, parens - 1);
    if (parens) continue;
    if (c === '{') {
      const prelude = css.slice(start, i).trim();
      blocks.push({ prelude, line: lineAt(firstNonSpace(start, i)), context: [...stack] });
      stack.push(prelude);
      start = i + 1;
    } else if (c === ';') {
      if (stack.length) flushDeclaration(i);
      start = i + 1;
    } else if (c === '}') {
      flushDeclaration(i);
      stack.pop();
      start = i + 1;
    }
  }
  return { css, declarations, blocks };
}

/** Inside a :root or @theme block — where token values are allowed to live. */
export const inTokenBlock = (context) => context.some((p) => /(^|[\s,]):root\b/.test(p) || /^@theme\b/.test(p));
export const inFontFace = (context) => context.some((p) => /^@font-face\b/.test(p));
