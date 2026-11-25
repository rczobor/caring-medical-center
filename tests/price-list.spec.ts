import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { formatHuf } from '../src/lib/format';

const prices: { category: string; huf: number; extra?: boolean }[] = parse(readFileSync('src/content/prices.yaml', 'utf8'));

const lowest = (category: string) => Math.min(...prices.filter((p) => p.category === category && !p.extra).map((p) => p.huf));

test('the prices index opens with the cheapest exam of each list, from the price list', async ({ page }) => {
  await page.goto('/arak');
  const summary = page.getByRole('list', { name: 'Legalacsonyabb árak' });
  const from = (category: string) => `${formatHuf(lowest(category), 'hu')}-tól`;
  await expect(summary.getByRole('link')).toHaveText([`Röntgen ${from('rtg')}`, `MR-vizsgálat ${from('mr')}`, `CT-vizsgálat ${from('ct')}`, `Rehabilitáció és szakrendelés ${from('rehab')}`], { useInnerText: true });
  await summary.getByRole('link', { name: /^MR-vizsgálat/ }).click();
  await expect(page).toHaveURL('/rontgen-es-mr-arak#mr');
});

test('the English prices index leads to the English price lists', async ({ page }) => {
  await page.goto('/en/prices');
  const summary = page.getByRole('list', { name: 'Lowest prices' });
  await expect(summary.getByRole('link', { name: /^CT scan/ })).toHaveText(`CT scan from ${formatHuf(lowest('ct'), 'en')}`, { useInnerText: true });
  await summary.getByRole('link', { name: /^MRI scan/ }).click();
  await expect(page).toHaveURL('/en/x-ray-and-mri-prices#mr');
});

test('the price list search finds exams with or without accents and hides empty sections', async ({ page }) => {
  await page.goto('/rontgen-es-mr-arak');
  const search = page.getByLabel('Vizsgálat keresése');
  const visibleRows = page.locator('[data-price-section] li:visible');
  const total = await visibleRows.count();

  await search.fill('terd');
  await expect(visibleRows).toHaveCount(4);
  await expect(visibleRows.first()).toContainText('Térd');
  await expect(page.getByRole('heading', { name: 'Röntgenvizsgálatok' })).toBeHidden();
  await expect(page.getByText('4 találat')).toBeVisible();

  await search.fill('nincs ilyen vizsgálat');
  await expect(visibleRows).toHaveCount(0);
  await expect(page.getByText('Nincs találat', { exact: false })).toBeVisible();

  await search.fill('');
  await expect(visibleRows).toHaveCount(total);
});

test('a price row links to the exam page that covers it', async ({ page }) => {
  await page.goto('/rontgen-es-mr-arak');
  await page.getByRole('link', { name: 'Térd natív MR vizsgálata', exact: true }).click();
  await expect(page).toHaveURL(/\/mrvizsgalat\/terdizuleti-mr$/);
});

test('price rows keep the order of the clinic’s price file, not alphabetical order', async ({ page }) => {
  await page.goto('/rontgen-es-mr-arak');
  const xray = page.locator('section:has(#rontgen) li');
  await expect(xray.first()).toContainText('RTG vizsgálat 1 irányú');
  await expect(xray.last()).toContainText('RTG további felvétel');
});
