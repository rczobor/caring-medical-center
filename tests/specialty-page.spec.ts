import { expect, test } from '@playwright/test';

const rheumatology = '/szakrendelesek/reumatologia';

test.describe('on a laptop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the doctors and their booking buttons sit beside the copy and stay in view', async ({ page }) => {
    await page.goto(rheumatology);
    const doctors = page.getByRole('region', { name: 'Orvosaink' });
    const book = doctors.getByRole('link', { name: 'Online foglalás, Dr. Pál Mónika' });
    await expect(book).toHaveAttribute('href', 'https://drpalmonika.hu/');
    await expect(doctors.getByRole('link', { name: 'Online foglalás, Dr. Selyem Réka Erzsébet' })).toBeVisible();

    // Halfway down the copy, the panel is still on screen, right of the text.
    await page.getByRole('heading', { name: 'Javasolt vizsgálatok' }).scrollIntoViewIfNeeded();
    await expect(book).toBeInViewport();
    const copy = await page.locator('.copy').boundingBox();
    const panel = await doctors.boundingBox();
    expect(panel!.x).toBeGreaterThan(copy!.x + copy!.width);
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the doctors follow the copy, and the booking bar leads to them', async ({ page }) => {
    await page.goto(rheumatology);
    const doctors = page.getByRole('region', { name: 'Orvosaink' });
    const copy = await page.locator('.copy').boundingBox();
    expect((await doctors.boundingBox())!.y).toBeGreaterThan(copy!.y + copy!.height);

    await page.locator('[data-booking-bar]').getByRole('link', { name: 'Időpontfoglalás' }).click();
    await expect(doctors.getByRole('link', { name: 'Online foglalás, Dr. Pál Mónika' })).toBeInViewport();
  });

  test('the closing band books through the doctors too, and the bar steps aside for it', async ({ page }) => {
    await page.goto(rheumatology);
    const band = page.getByRole('region', { name: 'Foglaljon időpontot rendelőnkbe!' });
    await expect(band.getByRole('link', { name: 'Időpontfoglalás' })).toHaveAttribute('href', '#foglalas');

    // The band at the top of the screen, the doctors panel above it and out of view.
    await band.evaluate((el) => el.scrollIntoView({ block: 'start' }));
    await expect(page.getByRole('region', { name: 'Orvosaink' })).not.toBeInViewport();
    await expect(page.locator('[data-booking-bar]')).toHaveAttribute('data-hidden');
  });
});
