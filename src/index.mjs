/** Programmatic entry: everything `ds` does, for build tools and tests. */
export { loadConfig, CORE_TOKENS, PACKAGE_ROOT } from './config.mjs';
export { loadSystem, renderCss, renderTailwind, renderClaudeDesign, declarations } from './build.mjs';
export { runChecks, CHECKS } from './checks.mjs';
export { renderCatalogue } from './catalogue.mjs';
export { ROLES, PAIRS } from './contract.mjs';
export { contrast, toneScale, toOklch, fromOklch, parseHex, toHex } from './color.mjs';
