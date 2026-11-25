/**
 * Site-wide guardrails. Each check turns a finding from the evaluation of the
 * current site into a rule every page must keep passing (finding numbers in
 * brackets), so the drift the previous site suffered can't creep back.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { load } from 'cheerio';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { DIST, fileFor, routes } from './routes';

for (const route of routes) {
  const english = route === '/en' || route.startsWith('/en/');
  test.describe(`page ${route}`, () => {
    test('has one h1 and complete metadata [10, 13]', async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('lang', english ? 'en' : 'hu');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL(route, 'https://caringmedicalcenter.hu').href);
    });

    test('has no serious accessibility violations [17, 18]', async ({ page }) => {
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(serious).toEqual([]);
    });

    test('contacts no third party and sets no cookie before consent [1]', async ({ page, baseURL }) => {
      const origin = new URL(baseURL!).origin;
      const thirdParty: string[] = [];
      page.on('request', (req) => {
        const url = new URL(req.url());
        if (url.protocol.startsWith('http') && url.origin !== origin) thirdParty.push(req.url());
      });
      await page.goto(route, { waitUntil: 'networkidle' });
      expect(thirdParty).toEqual([]);
      expect(await page.context().cookies()).toEqual([]);
    });

    for (const width of [390, 768, 1280, 1440]) {
      test(`fits a ${width}px viewport [4]`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
        // The header carries the booking button, or on narrow screens a page's own booking bar does.
        const book = await page
          .getByRole('link', { name: english ? 'Book an appointment' : 'Időpontfoglalás' })
          .filter({ visible: true })
          .first()
          .boundingBox();
        expect(book).not.toBeNull();
        expect(book!.x + book!.width).toBeLessThanOrEqual(width);
      });
    }
  });
}

test('every page links a favicon that is served', async ({ request }) => {
  const icons = new Set<string>();
  for (const route of routes) {
    const $ = load(readFileSync(fileFor(route), 'utf8'));
    const hrefs = $('link[rel="icon"], link[rel="apple-touch-icon"]').map((_, el) => $(el).attr('href')).get();
    expect(hrefs, route).toEqual(['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png']);
    for (const href of hrefs) icons.add(href);
  }
  for (const href of icons) expect((await request.get(href)).status(), href).toBe(200);
});

// Pages link each other by typed paths (complaint pathways, home cards, Markdown), so a
// renamed or retired page must not leave a link to nowhere.
test('every link to another page of the site leads to a page', () => {
  const pages = new Set(routes);
  const redirects = readFileSync(path.join(DIST, '_redirects'), 'utf8')
    .split('\n')
    .flatMap((line) => line.match(/^(\/\S*)\s/)?.slice(1) ?? [])
    .map((from) => decodeURI(from));
  const broken: string[] = [];
  for (const route of routes) {
    const $ = load(readFileSync(fileFor(route), 'utf8'));
    for (const href of $('a[href^="/"]').map((_, el) => $(el).attr('href')!).get()) {
      const target = decodeURI(href.split(/[?#]/)[0]!).replace(/\/$/, '') || '/';
      if (!pages.has(target) && !redirects.includes(target)) broken.push(`${route} → ${href}`);
    }
  }
  expect([...new Set(broken)]).toEqual([]);
});

// A link shared on Facebook, Messenger or Viber shows the page's title, text and photo.
test('every page has a share preview whose photo is served at the size it declares', async () => {
  const missing: string[] = [];
  for (const route of routes) {
    const $ = load(readFileSync(fileFor(route), 'utf8'));
    for (const key of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
      if (!$(`meta[property="${key}"]`).attr('content')) missing.push(`${route}: ${key}`);
    }
    const image = new URL($('meta[property="og:image"]').attr('content') ?? '', 'https://caringmedicalcenter.hu');
    const file = path.join(DIST, image.pathname);
    if (image.origin !== 'https://caringmedicalcenter.hu' || !existsSync(file)) {
      missing.push(`${route}: og:image ${image.href} is not in the build`);
      continue;
    }
    // Sharp never enlarges, so a small source would ship smaller than the tags say.
    const { width, height } = await sharp(file).metadata();
    const declared = `${$('meta[property="og:image:width"]').attr('content')}x${$('meta[property="og:image:height"]').attr('content')}`;
    if (`${width}x${height}` !== declared) missing.push(`${route}: og:image is ${width}x${height}, tags say ${declared}`);
  }
  expect(missing).toEqual([]);
});

test('structured data parses on every page, and the home page describes every clinic', () => {
  const clinics: { name: string; phone: string }[] = parse(readFileSync('src/content/clinics.yaml', 'utf8'));
  for (const route of routes) {
    const $ = load(readFileSync(fileFor(route), 'utf8'));
    for (const block of $('script[type="application/ld+json"]').map((_, el) => $(el).text()).get()) {
      expect(() => JSON.parse(block), route).not.toThrow();
    }
  }
  const $ = load(readFileSync(fileFor('/'), 'utf8'));
  const graph: { '@type': string; name?: string; telephone?: string }[] = JSON.parse($('script[type="application/ld+json"]').text())['@graph'];
  expect(graph.filter((e) => e['@type'] === 'MedicalClinic').map(({ name, telephone }) => ({ name, phone: telephone }))).toEqual(
    clinics.map(({ name, phone }) => ({ name, phone })),
  );
});

test('every page has its own title and description [10]', () => {
  const owners = new Map<string, string>();
  const clashes: string[] = [];
  for (const route of routes) {
    const $ = load(readFileSync(fileFor(route), 'utf8'));
    for (const value of [`title: ${$('title').text()}`, `description: ${$('meta[name="description"]').attr('content')}`]) {
      const owner = owners.get(value);
      if (owner) clashes.push(`${route} repeats ${owner}'s ${value}`);
      else owners.set(value, route);
    }
  }
  expect(clashes).toEqual([]);
});
