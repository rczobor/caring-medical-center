import { expect, test, type Locator, type Page } from '@playwright/test';

// The home hero's lights, snowbank and tree (HolidayDecor, HolidayTree), previewed with
// ?season=christmas|off so the tests don't depend on today's date.
const decorations = (page: Page) => ({
  bulbs: page.locator('.hero .bulb'),
  snowbank: page.locator('.hero svg[data-holiday]'),
  tree: page.locator('.hero .tree'),
});
const hero = (page: Page) => page.locator('.hero');
const box = async (locator: Locator) => (await locator.boundingBox())!;

/** Fails if the tree overlaps any line of the hero's text or any of its links. */
async function expectTreeClearOfText(page: Page) {
  const tree = await box(decorations(page).tree);
  const content = page.locator('.hero-copy').locator('h1, p, a, dl');
  expect(await content.count()).toBeGreaterThan(5);
  for (const el of await content.all()) {
    // The text's own line boxes, not its block: a short last line leaves room beside it.
    const lines = await el.evaluate((e) => {
      const range = document.createRange();
      range.selectNodeContents(e);
      return [...range.getClientRects()].map(({ x, y, width, height }) => ({ x, y, width, height }));
    });
    for (const r of lines) {
      const overlaps = tree.x < r.x + r.width && r.x < tree.x + tree.width && tree.y < r.y + r.height && r.y < tree.y + tree.height;
      expect(overlaps, `the tree covers ${await el.evaluate((e) => e.outerHTML.slice(0, 80))}`).toBe(false);
    }
  }
}

/** Fails unless each of the hero's buttons and price links takes a click at its centre. */
async function expectLinksClickable(page: Page) {
  const links = page.locator('.hero-copy a');
  expect(await links.count()).toBeGreaterThan(2);
  for (const link of await links.all()) {
    await link.scrollIntoViewIfNeeded();
    const hit = await link.evaluate((a) => {
      const r = a.getBoundingClientRect();
      return a.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    });
    expect(hit, `${await link.textContent()} is covered`).toBe(true);
  }
}

for (const width of [320, 390, 768, 1024, 1280, 1920, 2560]) {
  test.describe(`at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('the lights, snowbank and tree show in season and not out of it', async ({ page }) => {
      await page.goto('/?season=christmas');
      for (const piece of Object.values(decorations(page))) await expect(piece.first()).toBeVisible();
      await page.goto('/?season=off');
      for (const piece of Object.values(decorations(page))) await expect(piece.first()).toBeHidden();
    });

    test('the lights run the width of the hero, and the snowbank lines its bottom edge', async ({ page }) => {
      await page.goto('/?season=christmas');
      const edge = await box(hero(page));
      // Bulbs light both ends of the string, not just the middle.
      const bulbs = await decorations(page).bulbs.evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => r.x + r.width / 2));
      const shown = bulbs.filter((x) => x >= edge.x && x <= edge.x + edge.width);
      expect(Math.min(...shown) - edge.x).toBeLessThan(170);
      expect(edge.x + edge.width - Math.max(...shown)).toBeLessThan(170);

      const snowbank = await box(decorations(page).snowbank);
      expect(snowbank.x).toBeCloseTo(edge.x, 0);
      expect(snowbank.width).toBeCloseTo(edge.width, 0);
      expect(Math.abs(snowbank.y + snowbank.height - (edge.y + edge.height))).toBeLessThanOrEqual(1.5);
    });

    test('the tree covers none of the hero text, and the buttons and price links still take clicks', async ({ page }) => {
      await page.goto('/?season=christmas');
      await expectTreeClearOfText(page);
      await expectLinksClickable(page);
    });
  });
}

test.describe('in the Christmas season, on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the decorations stay inside the page and out of the way of the copy', async ({ page }) => {
    await page.goto('/?season=christmas');
    await expect(page.locator('.hero canvas[data-snow]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // The snowbank sits below the price figures, not over them.
    const figures = await box(page.locator('.hero dl'));
    const bank = await box(decorations(page).snowbank);
    expect(figures.y + figures.height).toBeLessThanOrEqual(bank.y + 8);
    // The lights hang in the dark eave above the photo, clear of the faces in it.
    const photo = await box(page.locator('.hero-photo'));
    const lowestBulb = await decorations(page).bulbs.evaluateAll((els) => Math.max(...els.map((el) => el.getBoundingClientRect().bottom)));
    expect(lowestBulb).toBeLessThanOrEqual(photo.y + 2);
    // The prices stay clickable through the snow.
    await page.locator('.hero dl a').first().click();
    await expect(page).toHaveURL(/rontgen-es-mr-arak|ct-arak/);
  });

  test('the menu opens over the lights', async ({ page }) => {
    await page.goto('/?season=christmas');
    await page.locator('details.menu summary').click();
    const menu = page.locator('details.menu nav');
    await expect(menu).toBeVisible();
    // The bulbs on screen, by their centres.
    const shown = await decorations(page).bulbs.evaluateAll((els) =>
      els
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.left >= 0 && r.right <= innerWidth)
        .map((r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })),
    );
    expect(shown.length).toBeGreaterThan(5);
    const covered = await menu.evaluate((nav, points) => points.every(({ x, y }) => nav.contains(document.elementFromPoint(x, y))), shown);
    expect(covered).toBe(true);
  });
});

// A visitor who sets a larger default text size in the browser: everything sized in rem grows,
// while the tree is sized in px.
for (const width of [320, 360, 430]) {
  for (const home of ['/', '/en']) {
    test(`with twice the default text size at ${width}px on ${home}, the decorations keep clear of the copy`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32 } });
      await page.goto(`${home}?season=christmas`);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('32px');
      await expectTreeClearOfText(page);
      await expectLinksClickable(page);
      const figures = await box(page.locator('.hero dl'));
      const bank = await box(decorations(page).snowbank);
      expect(figures.y + figures.height).toBeLessThanOrEqual(bank.y + 8);
    });
  }
}

test('reduced motion stops the twinkle and the star', async ({ page }) => {
  const running = () =>
    page.evaluate(() => [...document.querySelectorAll('.hero :is(.bulb, .tree .ornament, .tree .star)')].reduce((n, el) => n + el.getAnimations().length, 0));
  await page.goto('/?season=christmas');
  expect(await running()).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await running()).toBe(0);
});
