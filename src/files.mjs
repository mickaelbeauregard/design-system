/**
 * File lists for the checks. A small glob — `*`, `**`, `?` and `{a,b}` — so the
 * package stays dependency-free.
 */
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const SKIP_ANYWHERE = new Set(['node_modules', '.git']);
/* Build output, skipped at the project root only: checking it would report
   every violation twice, once in the source and once in the bundle. */
const SKIP_AT_ROOT = new Set(['dist', 'build', '.next', 'out', 'coverage', '.netlify', '.vercel']);

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      i++;
      if (glob[i + 1] === '/') {
        i++;
        re += '(?:.*/)?';
      } else re += '.*';
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      re += `(?:${glob.slice(i + 1, end).split(',').map(escape).join('|')})`;
      i = end;
    } else re += escape(c);
  }
  return new RegExp(`^${re}$`);
}

const escape = (s) => s.replace(/[.+^$()|[\]\\]/g, '\\$&');

function listFiles(root, dir = root, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const skip = SKIP_ANYWHERE.has(entry.name) || (dir === root && SKIP_AT_ROOT.has(entry.name));
      if (!skip) listFiles(root, full, out);
    } else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

export function expand(patterns = [], { cwd, ignore = [] }) {
  if (!patterns.length) return [];
  const all = listFiles(cwd);
  const want = patterns.map(globToRegExp);
  const skip = ignore.map(globToRegExp);
  return all.filter((f) => want.some((re) => re.test(f)) && !skip.some((re) => re.test(f))).sort();
}
