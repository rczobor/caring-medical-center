import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { isChristmas } from '../src/lib/season';

// Budapest is on winter time (UTC+1) at both ends of the season.
const budapest = (local: string) => new Date(`${local}+01:00`);

test('the season runs from 1 December to 6 January, by the date in Budapest', () => {
  expect(isChristmas(budapest('2026-11-30T23:59:59'))).toBe(false);
  expect(isChristmas(budapest('2026-12-01T00:00:00'))).toBe(true);
  expect(isChristmas(budapest('2026-12-31T23:59:59'))).toBe(true);
  expect(isChristmas(budapest('2027-01-01T00:00:00'))).toBe(true);
  expect(isChristmas(budapest('2027-01-06T23:59:59'))).toBe(true);
  expect(isChristmas(budapest('2027-01-07T00:00:00'))).toBe(false);
  expect(isChristmas(new Date('2026-07-15T12:00:00Z'))).toBe(false);
});

test('?season=christmas and ?season=off override the date; any other value is ignored', () => {
  const summer = new Date('2026-07-15T12:00:00Z');
  const christmas = new Date('2026-12-24T12:00:00Z');
  expect(isChristmas(summer, 'christmas')).toBe(true);
  expect(isChristmas(christmas, 'off')).toBe(false);
  for (const junk of ['', 'Christmas', 'on', 'yes', '1', null]) {
    expect(isChristmas(summer, junk)).toBe(false);
    expect(isChristmas(christmas, junk)).toBe(true);
  }
});

const season = (page: Page) => page.locator('html').getAttribute('data-season');
const snow = (page: Page) => page.locator('.hero canvas[data-snow]');

for (const home of ['/', '/en']) {
  test.describe(`home page ${home}`, () => {
    test('is decorated in season and plain out of it, with nothing to redeploy', async ({ page }) => {
      await page.clock.setFixedTime(budapest('2026-12-01T00:00:00'));
      await page.goto(home);
      expect(await season(page)).toBe('christmas');
      await expect(snow(page)).toBeVisible();

      await page.clock.setFixedTime(budapest('2027-01-07T00:00:00'));
      await page.reload();
      expect(await season(page)).toBeNull();
      await expect(snow(page)).toBeHidden();
    });

    test('?season= previews the look in summer and hides it at Christmas', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-07-15T12:00:00Z'));
      await page.goto(`${home}?season=christmas`);
      expect(await season(page)).toBe('christmas');

      await page.clock.setFixedTime(new Date('2026-12-24T12:00:00Z'));
      await page.goto(`${home}?season=off`);
      expect(await season(page)).toBeNull();
    });
  });
}

// At each end of the season a visitor's own date can differ from Budapest's.
const visitors = [
  // Still 30 November in Los Angeles, already 1 December in Budapest.
  { timezoneId: 'America/Los_Angeles', at: '2026-12-01T00:30:00', localDay: 30, decorated: true },
  // Already 7 January in Tokyo, still 6 January in Budapest.
  { timezoneId: 'Asia/Tokyo', at: '2027-01-06T20:00:00', localDay: 7, decorated: true },
  // Already 1 December in Auckland, still 30 November in Budapest.
  { timezoneId: 'Pacific/Auckland', at: '2026-11-30T20:00:00', localDay: 1, decorated: false },
  // Still 6 January in Honolulu, already 7 January in Budapest.
  { timezoneId: 'Pacific/Honolulu', at: '2027-01-07T00:30:00', localDay: 6, decorated: false },
];
for (const { timezoneId, at, localDay, decorated } of visitors) {
  test.describe(`for a visitor in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test(`the look follows the date in Budapest at ${at}`, async ({ page }) => {
      await page.clock.setFixedTime(budapest(at));
      await page.goto('/');
      expect(await page.evaluate(() => new Date().getDate())).toBe(localDay);
      expect(await season(page)).toBe(decorated ? 'christmas' : null);
    });
  });
}

test.describe('in a high-contrast (forced colours) mode', () => {
  test.use({ forcedColors: 'active' });

  // The decorations' own colours would be repainted into bright bands and black dots.
  test('the page stays plain, even in season', async ({ page }) => {
    await page.goto('/?season=christmas');
    expect(await season(page)).toBeNull();
    await expect(snow(page)).toBeHidden();
  });
});

test('other pages are never decorated', async ({ page }) => {
  await page.goto('/kapcsolat?season=christmas');
  expect(await season(page)).toBeNull();
});

/** The serious findings of the WCAG check the guardrails run on every page. */
async function seriousFindings(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  return violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

const sidewaysOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// The site-wide guardrails see the page as it is on the day they run; these hold the decorated
// one to the plain one at every width. Compared, not expected clean: narrower than the
// guardrails look, the plain page has findings of its own.
for (const width of [320, 390, 768, 1280, 1920, 2560]) {
  test(`decorated, the home page is no wider at ${width}px and adds no accessibility finding`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?season=off');
    const plain = { overflow: await sidewaysOverflow(page), findings: await seriousFindings(page) };
    await page.goto('/?season=christmas');
    expect(await season(page)).toBe('christmas');
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(plain.overflow);
    expect(await seriousFindings(page)).toEqual(plain.findings);
  });
}
