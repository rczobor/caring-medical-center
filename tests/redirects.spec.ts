import { expect, test } from '@playwright/test';
import retired from '../src/redirects.json' with { type: 'json' };

// Old links and search results must keep working: every retired URL, requested as
// browsers send it (percent-encoded), lands on its new page.
for (const { from, to } of retired) {
  test(`${decodeURIComponent(from)} leads to ${to}`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL((url) => url.pathname + url.hash === to);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}
