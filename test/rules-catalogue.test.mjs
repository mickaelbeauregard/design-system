/** docs/RULES.md is where every failure sends the reader, so the two must agree. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHECKS } from '../src/checks.mjs';

const rules = readFileSync(new URL('../docs/RULES.md', import.meta.url), 'utf8');
const documented = [...rules.matchAll(/^### (DS-\d{4}) — (.+)$/gm)].map((m) => ({ id: m[1], title: m[2] }));

test('every check is documented, and every documented rule has a check', () => {
  const checked = CHECKS.map((c) => c.id);
  assert.deepEqual(documented.map((d) => d.id).sort(), [...checked].sort());
  assert.equal(new Set(checked).size, checked.length, 'two checks share an id');
});

test('every documented rule has a Why, a Rule and an Enforced line', () => {
  for (const { id } of documented) {
    const body = rules.slice(rules.indexOf(`### ${id}`)).split(/\n### /)[0];
    for (const field of ['Why', 'Rule', 'Enforced']) assert.match(body, new RegExp(`${field}\\s*:`), `${id} has no ${field}`);
  }
});
