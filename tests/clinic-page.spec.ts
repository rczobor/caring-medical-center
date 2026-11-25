import { expect, test } from '@playwright/test';

const buda = '/caringmedical-buda-bemutato';

test.describe('on a laptop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the clinic's booking and details sit beside the copy", async ({ page }) => {
    await page.goto(buda);
    const panel = page.getByRole('region', { name: 'Foglalás és elérhetőség' });
    // The clinic's online booking from clinics.yaml, one row per service.
    await expect(panel.getByRole('link', { name: /^Online foglalás, / })).toHaveCount(4);
    await expect(panel.getByRole('link', { name: 'Online foglalás, CT vizsgálat, Caring Medical Buda' })).toHaveAttribute(
      'href',
      /^https:\/\/medicall\.cc\/idopontfoglalas\/caring-medical-center\//,
    );
    await expect(panel.getByRole('link', { name: '+36 30 201 3360, Caring Medical Buda hívása' })).toBeVisible();

    const copy = await page.locator('.copy').first().boundingBox();
    expect((await panel.boundingBox())!.x).toBeGreaterThan(copy!.x + copy!.width);
    // Said once: the facts left the copy for the panel.
    await expect(page.locator('.copy').first()).not.toContainText('Nyitvatartás');
  });
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the booking bar leads to the clinic panel', async ({ page }) => {
    await page.goto('/budaorsi-bemutato');
    await page.locator('[data-booking-bar]').getByRole('link', { name: 'Időpontfoglalás' }).click();
    const panel = page.getByRole('region', { name: 'Foglalás és elérhetőség' });
    await expect(panel.getByRole('link', { name: 'Online foglalás, MR vizsgálat, Caring Medical Budaörs' })).toBeInViewport();
    // The closing band books through the same panel.
    await expect(page.getByRole('region', { name: 'Foglaljon időpontot rendelőnkbe!' }).getByRole('link', { name: 'Időpontfoglalás' })).toHaveAttribute('href', '#foglalas');
  });
});
