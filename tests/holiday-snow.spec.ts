import { expect, test, type Page } from '@playwright/test';

// The hero's falling snow (src/lib/snow.ts), watched through its canvas.
const canvas = (page: Page) => page.locator('.hero canvas[data-snow]');

/** How many of the canvas's pixels have anything drawn on them. */
const inked = (page: Page) =>
  canvas(page).evaluate((c: HTMLCanvasElement) => {
    const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
    let n = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) n++;
    return n;
  });

const picture = (page: Page) => canvas(page).evaluate((c: HTMLCanvasElement) => c.toDataURL());

/** Whether the picture on the canvas changes within a quarter of a second. */
async function moving(page: Page) {
  const before = await picture(page);
  await page.waitForTimeout(250);
  return before !== (await picture(page));
}

test('snow falls on the hero', async ({ page }) => {
  await page.goto('/?season=christmas');
  await expect.poll(() => inked(page)).toBeGreaterThan(0);
  expect(await moving(page)).toBe(true);
});

test('out of season the snow never loads and nothing is drawn', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('/?season=off');
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(canvas(page)).toBeHidden();
  expect(await inked(page)).toBe(0);
  expect(scripts.filter((url) => /snow/i.test(url))).toEqual([]);
});

test('if the snow fails to load, the page carries on without an error', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/snow.*\.js$/, (route) => route.abort());
  await page.goto('/?season=christmas');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
  await expect(page.locator('.hero h1')).toBeVisible();
});

test('the snow stops while the hero is scrolled away and falls again on return', async ({ page }) => {
  await page.goto('/?season=christmas');
  await expect.poll(() => moving(page)).toBe(true);
  await page.evaluate(() => scrollTo(0, document.querySelector('.hero')!.getBoundingClientRect().bottom + scrollY + 200));
  await expect.poll(() => moving(page)).toBe(false);
  await page.evaluate(() => scrollTo(0, 0));
  await expect.poll(() => moving(page)).toBe(true);
});

test('the snow stands still once the visitor turns reduced motion on, and falls again when they turn it off', async ({ page }) => {
  await page.goto('/?season=christmas');
  await expect.poll(() => moving(page)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => moving(page)).toBe(false);
  expect(await inked(page)).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => moving(page)).toBe(true);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the snow is one still picture, drawn again after a resize', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?season=christmas');
    await expect.poll(() => inked(page)).toBeGreaterThan(0);
    expect(await moving(page)).toBe(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => canvas(page).evaluate((c: HTMLCanvasElement) => c.width)).toBe(390);
    await expect.poll(() => inked(page)).toBeGreaterThan(0);
    expect(await moving(page)).toBe(false);
  });

  // A small resize keeps the same flakes, so the redrawn picture must match: no flake flutters
  // sideways or turns between redraws.
  test('a redraw after a small resize shows the same picture', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?season=christmas');
    await expect.poll(() => inked(page)).toBeGreaterThan(0);
    const first = await picture(page);
    const width = () => canvas(page).evaluate((c: HTMLCanvasElement) => c.width);
    await page.setViewportSize({ width: 1296, height: 800 });
    await expect.poll(width).toBe(1296);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect.poll(width).toBe(1280);
    await expect.poll(() => picture(page)).toBe(first);
  });
});

// A 3× screen, to show the canvas's backing store stops at twice the hero's size.
test.describe('on a 3× screen', () => {
  test.use({ deviceScaleFactor: 3 });

  for (const [from, to] of [
    [1280, 390],
    [390, 1280],
  ] as const) {
    test(`the canvas follows the hero when the window goes from ${from} to ${to} px wide`, async ({ page }) => {
      await page.setViewportSize({ width: from, height: 900 });
      await page.goto('/?season=christmas');
      await page.setViewportSize({ width: to, height: 900 });
      const sizes = () =>
        canvas(page).evaluate((c: HTMLCanvasElement) => {
          const hero = c.closest('.hero')!;
          const box = (el: Element) => {
            const { x, y, width, height } = el.getBoundingClientRect();
            return [x, y, width, height];
          };
          return {
            box: box(c),
            backing: [c.width, c.height],
            hero: box(hero),
            twiceHero: [Math.round(c.clientWidth * 2), Math.round(c.clientHeight * 2)],
          };
        });
      await expect
        .poll(async () => {
          const s = await sizes();
          return s.box.join() === s.hero.join() && s.backing.join() === s.twiceHero.join() && s.hero[2] === to;
        })
        .toBe(true);
    });
  }
});
