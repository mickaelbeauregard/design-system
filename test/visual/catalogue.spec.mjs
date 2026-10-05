import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const url = pathToFileURL(resolve('catalogue/index.html')).href;
const sections = ['roles', 'scales', 'type', 'shape', 'buttons', 'grounds', 'links', 'cards', 'fields', 'status', 'dialog'];

for (const scheme of ['light', 'dark']) {
  test.describe(scheme, () => {
    test.use({ colorScheme: scheme });

    for (const id of sections) {
      test(id, async ({ page }) => {
        await page.goto(url);
        await expect(page.locator(`#${id}`)).toHaveScreenshot(`${id}-${scheme}.png`);
      });
    }

    test('dialog open', async ({ page }) => {
      await page.goto(url);
      await page.getByRole('button', { name: 'Open the dialog' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page).toHaveScreenshot(`dialog-open-${scheme}.png`);
    });

    test('no horizontal scroll', async ({ page }) => {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
    });
  });
}
