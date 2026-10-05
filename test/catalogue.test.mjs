import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.mjs';
import { loadSystem } from '../src/build.mjs';
import { renderCatalogue } from '../src/catalogue.mjs';
import { ROLES } from '../src/contract.mjs';
import { project } from './helpers.mjs';

const config = loadConfig(project());
const html = renderCatalogue(loadSystem(config), config);

test('the catalogue is self-contained: no stylesheet or script from the network', () => {
  assert.doesNotMatch(html, /<link[^>]+href="https?:/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /@import/);
});

test('it shows every colour role and every component', () => {
  for (const role of Object.keys(ROLES).filter((r) => r.startsWith('color.'))) assert.ok(html.includes(`<strong>${role.replace('.', '-')}</strong>`), role);
  for (const cls of ['ds-button', 'ds-link', 'ds-card', 'ds-input', 'ds-switch', 'ds-badge', 'ds-alert', 'ds-dialog']) assert.ok(html.includes(`class="${cls}`), cls);
});

test('it carries no inline style attributes', () => {
  assert.doesNotMatch(html, /\sstyle="/);
});
