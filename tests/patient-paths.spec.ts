/**
 * Ways in for patients who know what hurts rather than which exam they need:
 * the home page's complaints, the complaint pages, and the doctors directory.
 */
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { formatHuf } from '../src/lib/format';

const home: { complaints: { name: string; page: string }[] } = parse(readFileSync('src/content/home.yaml', 'utf8'));
const doctors: { name: string; booking?: string }[] = parse(readFileSync('src/content/doctors.yaml', 'utf8'));
const prices: { id: string; huf: number }[] = parse(readFileSync('src/content/prices.yaml', 'utf8'));

test('every complaint on the home page opens its page', async ({ page }) => {
  await page.goto('/');
  const help = page.getByRole('region', { name: 'Miben segíthetünk?' });
  for (const { name, page: href } of home.complaints) {
    await expect(help.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
  }
  await help.getByRole('link', { name: home.complaints[0]!.name, exact: true }).click();
  // The card and the page's heading are separate copy fields, so only the landing is checked.
  await expect(page).toHaveURL(home.complaints[0]!.page);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a complaint page walks from exam to specialist to treatment, with exam prices from the price list', async ({ page }) => {
  await page.goto('/panaszok/terdfajdalom');
  const steps = page.getByRole('region', { name: 'Így segítünk' });
  await expect(steps.getByRole('heading', { level: 3 })).toHaveText(['Képalkotó vizsgálat', 'Szakorvosi vélemény', 'Kezelés és rehabilitáció']);

  // The cheapest of the rows the exam page lists is its "from" price.
  const exam = parse(readFileSync('src/content/exams/mr/terdizuleti-mr.md', 'utf8').split(/^---$/m)[1]!) as { prices: string[] };
  const from = Math.min(...prices.filter((p) => exam.prices.includes(p.id)).map((p) => p.huf));
  await expect(steps.getByRole('link', { name: /^Térdizületi MR/ })).toContainText(`${formatHuf(from, 'hu')}-tól`);

  // A page without a price list gets no price.
  const physio = steps.getByRole('link', { name: 'Gyógytorna', exact: true });
  await expect(physio).toHaveAttribute('href', '/rehabilitacio/gyogytorna-fizikoterapia');
  await expect(physio).not.toContainText('Ft');
  await expect(page.getByRole('region', { name: 'Orvosaink' }).getByRole('heading', { level: 3 })).toHaveCount(3);
});

test('the doctors directory lists every doctor, with online booking where they have it', async ({ page }) => {
  await page.goto('/orvosaink');
  for (const { name, booking } of doctors) {
    await expect(page.getByRole('heading', { level: 3, name, exact: true }).first()).toBeVisible();
    if (booking) await expect(page.getByRole('link', { name: `Online foglalás, ${name}` }).first()).toHaveAttribute('href', booking);
  }
  // Each specialty heading leads to its page.
  await expect(page.getByRole('link', { name: 'Reumatológiai szakrendelés' })).toHaveAttribute('href', '/szakrendelesek/reumatologia');
});

test('the patient information page opens with a contents list that jumps to each topic', async ({ page }) => {
  await page.goto('/paciensinformaciok');
  const contents = page.getByRole('list').filter({ has: page.getByRole('link', { name: 'Kell-e beutaló?' }) }).first();
  const links = contents.getByRole('link');
  await expect(links).toHaveCount(6);
  for (const link of await links.all()) {
    const id = decodeURIComponent((await link.getAttribute('href'))!.slice(1));
    await expect(page.locator(`h2[id="${id}"]`)).toHaveText((await link.textContent())!);
  }
});
