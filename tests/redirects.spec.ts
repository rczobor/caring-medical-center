import { expect, test } from '@playwright/test';
import urlPlan from '../migration/url-plan.json' with { type: 'json' };

// Old links and search results must keep working: every retired URL of the live
// site, requested as browsers send it (percent-encoded), lands on its new page.
for (const { from, to } of urlPlan.filter((e) => e.action === 'redirect')) {
  test(`${decodeURIComponent(from)} leads to ${to}`, async ({ page }) => {
    await page.goto(from);
    await expect(page).toHaveURL((url) => url.pathname + url.hash === to);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}
