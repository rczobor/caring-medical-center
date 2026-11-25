/**
 * The English pages and their Hungarian originals. These read the built HTML; no browser needed.
 */
import { expect, test } from '@playwright/test';
import { load } from 'cheerio';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DIST, fileFor, routes, SITE } from './routes';

const isEnglish = (route: string) => route === '/en' || route.startsWith('/en/');
const pageOf = (route: string) => load(readFileSync(fileFor(route), 'utf8'));
const pathOf = (href: string) => new URL(href, SITE).pathname;

/** Each page's translation, from its hreflang link: the source of the language switch too. */
const translationOf = new Map(
  routes.flatMap((route) => {
    const href = pageOf(route)(`link[rel="alternate"][hreflang="${isEnglish(route) ? 'hu' : 'en'}"]`).attr('href');
    return href ? [[route, pathOf(href)] as const] : [];
  }),
);

test('a translated page and its translation point at each other', () => {
  expect(translationOf.size).toBeGreaterThan(50);
  for (const [route, other] of translationOf) {
    expect(routes, `${route} → ${other}`).toContain(other);
    expect(isEnglish(other), route).toBe(!isEnglish(route));
    expect(translationOf.get(other), `${other} should point back to ${route}`).toBe(route);
  }
});

// English copy is written with English paths, and shared data is mapped (src/lib/translations.ts).
// A page translated later would otherwise leave English pages linking its Hungarian version.
test('English pages link the English version of a page wherever there is one', () => {
  for (const route of routes.filter(isEnglish)) {
    const $ = pageOf(route);
    const stale = $('main a[href^="/"], header a[href^="/"]:not([hreflang]), footer a[href^="/"]')
      .map((_, a) => pathOf($(a).attr('href')!))
      .get()
      .filter((path) => !isEnglish(path) && translationOf.has(path));
    expect(stale, route).toEqual([]);
  }
});

test('the language link leads to the same page in the other language, or to its homepage', () => {
  const languageLink = (route: string) => pageOf(route)('header a[hreflang]').first();
  expect(languageLink('/mrvizsgalat/terdizuleti-mr').attr('href')).toBe('/en/mri/knee-mri');
  expect(languageLink('/mrvizsgalat/terdizuleti-mr').attr('lang')).toBe('en');
  expect(languageLink('/en/mri/knee-mri').attr('href')).toBe('/mrvizsgalat/terdizuleti-mr');
  // Every content page has a translation; the not-found page has none.
  expect(languageLink('/404').attr('href')).toBe('/en');
});

test('English pages show English prices and opening hours', () => {
  const $ = pageOf('/en/mri/knee-mri');
  expect($('main').text()).toMatch(/HUF \d{2},\d{3}/);
  expect($('main').text()).not.toMatch(/\d Ft\b/);
  expect(pageOf('/en/contact')('main').text()).toContain('Saturday: 08:00–16:00 (exact hours may vary)');
});

test('the English news lists only English articles, dated in English', () => {
  const english = routes.filter((route) => route.startsWith('/en/news/'));
  expect(english).toHaveLength(readdirSync('src/content/site/en/hirek').length);
  const index = pageOf('/en/news');
  const listed = index('main h3 a').map((_, a) => index(a).attr('href')).get();
  expect(listed.toSorted()).toEqual(english.toSorted());

  const $ = pageOf(english[0]!);
  expect($('main time').first().text()).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  const more = $('aside a').map((_, a) => $(a).attr('href')).get();
  expect(more).toHaveLength(3);
  for (const href of more) expect(href).toMatch(/^\/en\/news\//);
});

// The CMS previews an English page at its Hungarian path under /en (astro.config.mjs).
test('an English path with Hungarian names redirects to an English page', () => {
  const rules = readFileSync(path.join(DIST, '_redirects'), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('/en/'))
    .map((line) => line.split(' '));
  expect(rules.length).toBeGreaterThan(5);
  for (const [from, to] of rules) {
    if (to!.endsWith('/:splat')) expect(routes.some((r) => r.startsWith(to!.replace(':splat', ''))), from).toBe(true);
    else expect(routes, from).toContain(to);
  }
});

test('the English home page’s lowest prices each fit their column', async ({ page }) => {
  for (const width of [320, 390, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/en');
    const prices = page.getByRole('region', { name: /^Fast, accurate exams/ }).locator('dl > div');
    await expect(prices.first().locator('dd')).toContainText(/^from\s*HUF/);
    const overflow = await prices.evaluateAll((cells) =>
      cells.map((cell) => cell.getBoundingClientRect().right - cell.querySelector('dd .link-bar')!.getBoundingClientRect().right),
    );
    expect(overflow.every((room) => room >= 0), `${width}px: ${overflow.join(', ')}`).toBe(true);
  }
});
