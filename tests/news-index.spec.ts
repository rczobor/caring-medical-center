import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';

const articles = readdirSync(path.join(import.meta.dirname, '..', 'src/content/site/hirek')).filter((f) => f.endsWith('.md'));

// Every article on the one page, newest first; years keep it scannable.
test('every article is listed once, under its year, and the year links jump there', async ({ page }) => {
  await page.goto('/hirek');
  const listed = page.getByRole('main').locator('a[href^="/hirek/"]');
  await expect(listed).toHaveCount(articles.length);

  const years = page.getByRole('navigation', { name: 'Hírek évenként' }).getByRole('link');
  await expect(years.first()).toHaveText('2026');
  await page.getByRole('navigation', { name: 'Hírek évenként' }).getByRole('link', { name: '2022' }).click();
  await expect(page.getByRole('heading', { name: '2022', level: 2 })).toBeInViewport();
  await expect(page.getByRole('region', { name: '2022' }).getByRole('link').first()).toBeVisible();
});
