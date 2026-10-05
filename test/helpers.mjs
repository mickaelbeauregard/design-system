/** A throwaway project on disk: the template brand, a config, and whatever CSS a test needs. */
import { mkdtempSync, writeFileSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { loadConfig } from '../src/config.mjs';
import { loadSystem } from '../src/build.mjs';
import { runChecks } from '../src/checks.mjs';

const TEMPLATES = new URL('../templates/', import.meta.url).pathname;

export function project({ css = {}, markup = {}, config = {}, brand } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ds-test-'));
  mkdirSync(join(dir, 'design'));
  if (brand) writeFileSync(join(dir, 'design/brand.tokens.json'), JSON.stringify(brand));
  else copyFileSync(join(TEMPLATES, 'brand.tokens.json'), join(dir, 'design/brand.tokens.json'));
  const files = { ...css, ...markup };
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  const cfg = {
    name: 'Test',
    tokens: ['design/brand.tokens.json'],
    out: {},
    check: { css: ['**/*.css'], markup: Object.keys(markup).length ? ['**/*.{html,jsx,tsx}'] : [], off: {}, pairs: [] },
    ...config,
  };
  writeFileSync(join(dir, 'ds.config.json'), JSON.stringify(cfg));
  return dir;
}

export function check(dir) {
  const config = loadConfig(dir);
  const sys = loadSystem(config);
  const results = runChecks({ config, system: sys.errors.length ? null : sys, systemErrors: sys.errors });
  return Object.fromEntries(results.map((r) => [r.id, r]));
}

/** The ids of the checks that failed. */
export const failing = (results) => Object.values(results).filter((r) => r.violations.length).map((r) => r.id);

export const templateBrand = () => JSON.parse(readFileSync(join(TEMPLATES, 'brand.tokens.json'), 'utf8'));
