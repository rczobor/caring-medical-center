import { expect, test } from '@playwright/test';

const article = '/hirek/uj-diagnosztikai-kozpont-budaorson';

test.use({ viewport: { width: 1280, height: 900 } });

test('an article offers the three newest other articles beside the copy', async ({ page }) => {
  await page.goto(article);
  const more = page.getByRole('region', { name: 'További hírek' });
  const links = more.getByRole('link');
  await expect(links).toHaveCount(3);
  await expect(more.locator(`a[href="${article}"]`)).toHaveCount(0);

  const copy = await page.locator('.copy').boundingBox();
  expect((await more.boundingBox())!.x).toBeGreaterThan(copy!.x + copy!.width);
});
