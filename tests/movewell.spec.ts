import { expect, test } from '@playwright/test';

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the booking bar leads to the programmes, each booked with its own button', async ({ page }) => {
    await page.goto('/movewell');
    await page.locator('[data-booking-bar]').getByRole('link', { name: 'Időpontfoglalás' }).click();
    const programmes = page.getByRole('region', { name: 'Válaszd a hozzád illő MoveWell programot' });
    await expect(programmes.getByRole('link', { name: 'Balance csomag foglalása' })).toBeInViewport();
    await expect(programmes.getByRole('link', { name: 'Sport csomag foglalása' })).toHaveAttribute('href', '/kapcsolat');
    await expect(page.locator('[data-booking-bar]')).toHaveAttribute('data-hidden');
  });
});
