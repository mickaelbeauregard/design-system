/**
 * Screenshot comparison of the catalogue, section by section, at the two widths
 * every change is looked at. Baselines live beside the spec and are per
 * platform: fonts render differently on macOS and Linux, so a baseline made on
 * one is not a comparison on the other.
 *
 *   npm run test:visual                    compare
 *   npm run test:visual -- --update-snapshots   accept a deliberate change
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test/visual',
  reporter: 'list',
  use: {
    /* The installed Chrome locally; in CI, Playwright's own Chromium. */
    channel: process.env.CI ? undefined : 'chrome',
  },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  projects: [
    { name: 'phone', use: { viewport: { width: 375, height: 812 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
});
