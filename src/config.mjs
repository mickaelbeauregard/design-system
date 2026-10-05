/**
 * ds.config.json, read from the project root. See templates/ds.config.json for
 * every field with a note on what it does.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const CORE_TOKENS = join(PACKAGE_ROOT, 'tokens', 'core.tokens.json');

export class ConfigError extends Error {}

export function loadConfig(cwd = process.cwd(), file = 'ds.config.json') {
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(cwd, file), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') throw new ConfigError(`${file} not found in ${cwd} — run \`ds init\` first`);
    throw new ConfigError(`${file}: ${err.message}`);
  }
  const at = (p) => resolve(cwd, p);
  const off = raw.check?.off ?? {};
  /* An opt-out without a reason is how a rule quietly stops holding. The same
     standard as a ds-allow comment in the CSS. */
  for (const [id, reason] of Object.entries(off)) {
    if (typeof reason !== 'string' || reason.trim().length < 10) {
      throw new ConfigError(`${file}: check.off.${id} needs a reason (a sentence, not a flag)`);
    }
  }
  return {
    cwd,
    name: raw.name ?? 'Design system',
    tokenFiles: [CORE_TOKENS, ...(raw.tokens ?? []).map(at)],
    themes: Object.fromEntries(Object.entries(raw.themes ?? {}).map(([k, files]) => [k, files.map(at)])),
    out: Object.fromEntries(Object.entries(raw.out ?? {}).filter(([, v]) => v).map(([k, v]) => [k, at(v)])),
    check: {
      css: raw.check?.css ?? ['**/*.css'],
      markup: raw.check?.markup ?? [],
      ignore: raw.check?.ignore ?? [],
      off,
      pairs: raw.check?.pairs ?? [],
    },
  };
}
