import { expect, test } from '@playwright/test';

const knee = '/mrvizsgalat/terdizuleti-mr';

test('the header booking button jumps to the exam page’s own booking panel', async ({ page }) => {
  await page.goto(knee);
  await expect(page.getByRole('banner').getByRole('link', { name: 'Időpontfoglalás' })).toHaveAttribute('href', '#foglalas');
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the booking bar leads to the booking panel, then steps aside', async ({ page }) => {
    await page.goto(knee);
    const bar = page.locator('[data-booking-bar]');
    const book = bar.getByRole('link', { name: 'Időpontfoglalás' });
    await expect(book).toBeInViewport();

    await book.click();
    await expect(page.locator('#foglalas')).toBeInViewport();
    await expect(bar).toHaveAttribute('data-hidden');
    // Hidden means out of reach too: not focusable or clickable while off screen.
    await expect(bar).toHaveJSProperty('inert', true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar).not.toHaveAttribute('data-hidden');
    await expect(book).toBeInViewport();
  });
});

test.describe('on a short laptop screen', () => {
  test.use({ viewport: { width: 1280, height: 480 } });

  test('the sticky booking panel stays within the viewport, so every clinic is reachable', async ({ page }) => {
    await page.goto(knee);
    await page.locator('#tudnivalok').scrollIntoViewIfNeeded();
    const box = await page.locator('aside:has(#foglalas)').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(480);
  });
});
