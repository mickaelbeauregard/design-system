#!/usr/bin/env node
/**
 * ds — the design system's command line.
 *
 *   ds init [--tailwind] [--dark]   scaffold the brand file, config and DESIGN.md
 *   ds build                        tokens → the files listed under "out"
 *   ds check                        every rule in docs/RULES.md; exits 1 on a failure
 *   ds catalogue [--out file]       one HTML page previewing every component in this brand
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { loadConfig, ConfigError, PACKAGE_ROOT } from '../src/config.mjs';
import { loadSystem, renderCss, renderTailwind, renderClaudeDesign } from '../src/build.mjs';
import { runChecks } from '../src/checks.mjs';
import { renderCatalogue } from '../src/catalogue.mjs';

const [command = 'help', ...args] = process.argv.slice(2);
const cwd = process.cwd();
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function config() {
  try {
    return loadConfig(cwd);
  } catch (err) {
    if (err instanceof ConfigError) fail(err.message);
    throw err;
  }
}

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  console.log(`  wrote ${relative(cwd, file)}`);
}

const commands = {
  init() {
    const tailwind = flag('tailwind');
    const dark = flag('dark');
    const place = (from, to) => {
      const target = join(cwd, to);
      if (existsSync(target)) return console.log(`  kept  ${to} (already there)`);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(PACKAGE_ROOT, 'templates', from), target);
      console.log(`  wrote ${to}`);
    };
    place('brand.tokens.json', 'design/brand.tokens.json');
    if (dark) place('brand.dark.tokens.json', 'design/brand.dark.tokens.json');
    place('DESIGN.md', 'DESIGN.md');
    if (!existsSync(join(cwd, 'ds.config.json'))) {
      const template = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'templates', 'ds.config.json'), 'utf8'));
      if (dark) template.themes = { dark: ['design/brand.dark.tokens.json'] };
      if (tailwind) {
        template.out.tailwind = 'design/tokens.tailwind.css';
        delete template.out.css;
        /* Only the sources: Tailwind's compiled output is full of its own
           literals, and checking it would fail every rule on code nobody wrote. */
        template.check.css = ['src/**/*.css'];
        template.check.markup = ['src/**/*.{html,jsx,tsx,vue,svelte,astro}'];
      }
      write(join(cwd, 'ds.config.json'), JSON.stringify(template, null, 2) + '\n');
    } else console.log('  kept  ds.config.json (already there)');
    console.log(
      '\nNext:\n' +
        '  1. Put the brand\'s colours and typefaces in design/brand.tokens.json.\n' +
        '  2. npx ds build && npx ds check\n' +
        (tailwind
          ? '  3. In your main CSS:  @import "tailwindcss";\n' +
            '                       @import "../design/tokens.tailwind.css";\n' +
            '                       @import "@mickaelbeauregard/design-system/css/tailwind.css";\n'
          : '  3. In your main CSS:  @import "../design/tokens.css";\n' +
            '                       @import "@mickaelbeauregard/design-system/css";\n') +
        '  4. Add `ds check` to your lint script, and paste templates/AGENTS.snippet.md into AGENTS.md.'
    );
  },

  build() {
    const cfg = config();
    const sys = loadSystem(cfg);
    if (sys.errors.length) fail(`tokens:\n  ${sys.errors.join('\n  ')}`);
    const renders = {
      css: () => renderCss(sys),
      tailwind: () => renderTailwind(sys),
      claudeDesign: () => renderClaudeDesign(sys, cfg.name),
      catalogue: () => renderCatalogue(sys, cfg),
    };
    const outs = Object.entries(cfg.out);
    if (!outs.length) fail('ds.config.json lists nothing under "out"');
    for (const [key, file] of outs) {
      if (!renders[key]) fail(`out.${key}: unknown output (css, tailwind, claudeDesign, catalogue)`);
      write(file, renders[key]());
    }
    console.log(`✓ build: ${sys.base.tokens.size} tokens, ${sys.themeNames.length} theme(s).`);
  },

  check() {
    const cfg = config();
    const sys = loadSystem(cfg);
    const results = runChecks({ config: cfg, system: sys.errors.length ? null : sys, systemErrors: sys.errors });
    let failed = 0;
    for (const r of results) {
      if (r.skipped) {
        console.log(`  – ${r.id} ${r.what} (off: ${r.skipped})`);
        continue;
      }
      if (!r.violations.length) {
        console.log(`  ✓ ${r.id} ${r.what}`);
        continue;
      }
      failed++;
      console.error(`  ✗ ${r.id} ${r.what}`);
      for (const v of r.violations) {
        const where = v.file ? `${v.file}${v.line ? `:${v.line}` : ''}  ` : '';
        console.error(`      ${where}${v.message}`);
      }
    }
    const ran = results.filter((r) => !r.skipped).length;
    if (failed) {
      console.error(`\n✗ ds: ${failed} of ${ran} checks failed. Each rule's Why: docs/RULES.md in @mickaelbeauregard/design-system.`);
      process.exit(1);
    }
    console.log(`\n✓ ds: ${ran}/${ran} checks pass.`);
  },

  catalogue() {
    const cfg = config();
    const sys = loadSystem(cfg);
    if (sys.errors.length) fail(`tokens:\n  ${sys.errors.join('\n  ')}`);
    const out = option('out') ? join(cwd, option('out')) : cfg.out.catalogue;
    if (!out) fail('give --out <file>, or set out.catalogue in ds.config.json');
    write(out, renderCatalogue(sys, cfg));
  },

  help() {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, '').trim());
  },
};

(commands[command] ?? (() => fail(`unknown command "${command}" — try \`ds help\``)))();
