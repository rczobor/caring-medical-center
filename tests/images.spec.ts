import { expect, test, type Locator } from '@playwright/test';

// The file the browser chose from the srcset: its own pixels, not the box it fills.
const loaded = (img: Locator) =>
  img.evaluate(async (el: HTMLImageElement) => {
    await el.decode();
    return { width: el.naturalWidth, height: el.naturalHeight };
  });

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

  // The home photo is a tall portrait shown in a wide strip, so phones get a copy cut to the strip.
  test('the home photo comes cut to its strip', async ({ page }) => {
    await page.goto('/');
    const { width, height } = await loaded(page.locator('.hero img'));
    expect(width / height).toBeCloseTo(320 / 216, 2);
  });

  // An index card is about 170 px wide: its picture comes from the srcset, not the 1600 px original.
  test('index cards load a picture near their size', async ({ page }) => {
    await page.goto('/szakrendelesek/info');
    const card = page.locator('.copy ul img').first();
    await card.scrollIntoViewIfNeeded();
    expect((await loaded(card)).width).toBeLessThanOrEqual(720);
  });
});

test.describe('on a laptop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // Beside the text the panel is tall: the whole portrait.
  test('the home photo is the whole portrait', async ({ page }) => {
    await page.goto('/');
    const { width, height } = await loaded(page.locator('.hero img'));
    expect(width / height).toBeCloseTo(2 / 3, 2);
  });
});
