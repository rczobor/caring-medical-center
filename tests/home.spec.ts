import { expect, test, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { formatHuf } from '../src/lib/format';

test('"from" prices count exams, not add-ons like an extra X-ray image', async ({ page }) => {
  // Read from the price list, so editing a price doesn't break the test.
  const prices: { category: string; huf: number; extra?: boolean }[] = parse(readFileSync('src/content/prices.yaml', 'utf8'));
  const exams = prices.filter((p) => p.category === 'rtg' && !p.extra).map((p) => p.huf);

  await page.goto('/');
  const xray = page.locator('#diagnosztika li', { has: page.getByRole('link', { name: 'Röntgenvizsgálatok' }) });
  await expect(xray).toContainText(`${formatHuf(Math.min(...exams), 'hu')}-tól`);
});

// The desktop light box: the photo beside the list follows the row under the pointer.
test('hovering a Diagnosztika row shows its photo beside the list', async ({ page }) => {
  await page.goto('/');
  const plates = page.locator('#diagnosztika [data-plate]');
  await expect(plates.nth(0)).toHaveCSS('opacity', '1');
  await page.locator('#diagnosztika li').nth(2).hover();
  await expect(plates.nth(2)).toHaveCSS('opacity', '1');
  await expect(plates.nth(0)).toHaveCSS('opacity', '0');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // Phones get the whole Diagnostics section too.
  test('the diagnostics section is there, with all five services', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Diagnosztika', level: 2, exact: true })).toBeVisible();
    await expect(page.locator('#diagnosztika li')).toHaveCount(5);
    for (const name of ['MRI vizsgálatok', 'Röntgenvizsgálatok', 'Laborvizsgálatok', 'Ultrahang']) {
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
    }
  });
});

// On a page without a module script, parsing can finish before the stylesheet arrives. If the
// opt-in lived only in the stylesheet, Chrome dropped the transition (it did on /ultrahang).
// It is a race: without the fix this failed 5 of 8 runs, so one pass proves little.
test('opening a service from its card animates on a slow connection', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 1.5e6, uploadThroughput: 1e6 });
  await page.addInitScript(() => {
    addEventListener('pagereveal', (e) => sessionStorage.setItem('transition', String(e.viewTransition !== null)));
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Ultrahang', exact: true }).click();
  await expect(page).toHaveURL(/\/ultrahang$/);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('transition'))).toBe('true');
});

// A clinic card shows its page's photo under the same transition name, so opening the clinic
// moves the photo into the page's hero instead of fading one photo into another.
test("each clinic card's photo moves into its page", async ({ page }) => {
  const transitionName = (img: Locator) => img.evaluate((el) => getComputedStyle(el).viewTransitionName);
  await page.goto('/');
  const cards = await page.locator('li[data-clinic]:has(h3)').all();
  expect(cards).toHaveLength(3);
  const clinics = [];
  for (const card of cards) {
    const href = await card.getByRole('heading').getByRole('link').getAttribute('href');
    clinics.push({ href: href!, name: await transitionName(card.getByRole('img')) });
  }
  for (const { href, name } of clinics) {
    expect(name).toMatch(/^photo-/);
    await page.goto(href);
    expect(await transitionName(page.getByRole('main').getByRole('img').first())).toBe(name);
  }
});

// The hero's Christmas decorations follow the visitor's own date: 1 December to 6 January.
const seasonDays = [
  ['2026-11-30T12:00', false],
  ['2026-12-01T00:05', true],
  ['2027-01-06T23:55', true],
  ['2027-01-07T00:05', false],
] as const;
for (const [date, decorated] of seasonDays) {
  test(`the hero is ${decorated ? '' : 'not '}decorated for Christmas on ${date}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(date));
    await page.goto('/');
    await expect(page.locator('.hero canvas[data-snow]')).toBeVisible({ visible: decorated });
  });
}

test.describe('in the Christmas season, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the decorations stay inside the page and out of the way of the copy', async ({ page }) => {
    await page.goto('/?season=christmas');
    await expect(page.locator('.hero canvas[data-snow]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // The snowbank sits below the price figures, not over them.
    const figures = await page.locator('.hero dl').boundingBox();
    const bank = await page.locator('.hero svg[data-holiday]').boundingBox();
    expect(figures!.y + figures!.height).toBeLessThanOrEqual(bank!.y + 8);
    // The prices stay clickable through the snow.
    await page.locator('.hero dl a').first().click();
    await expect(page).toHaveURL(/rontgen-es-mr-arak|ct-arak/);
  });
});
