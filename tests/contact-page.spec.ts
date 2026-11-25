import { expect, test } from '@playwright/test';

test('booking options come from the clinics that offer each service', async ({ page }) => {
  await page.goto('/kapcsolat');
  const onlineLinks = (service: string) => page.locator(`section#${service}`).getByRole('link', { name: /^Online foglalás/ });

  await expect(onlineLinks('mr')).toHaveCount(3);
  await expect(onlineLinks('ct')).toHaveCount(1);
  await expect(onlineLinks('ct')).toHaveAccessibleName('Online foglalás, Caring Medical Buda');
  await expect(onlineLinks('ct')).toHaveAttribute('href', /caring-medical-center\/specializations\?qualificationId=90036$/);
  await expect(onlineLinks('labor')).toHaveAttribute('href', 'https://whitelab.hu/idopontfoglalas');
});

test('an exam page books at the same clinics, in clinic order', async ({ page }) => {
  await page.goto('/mrvizsgalat/terdizuleti-mr');
  const names = await page.locator('#foglalas h3').allTextContents();
  expect(names).toEqual(['Caring Medical Point', 'Caring Medical Buda', 'Caring Medical Budaörs']);
});

test('the full deposit terms are where exam pages link to them', async ({ page }) => {
  await page.goto('/kapcsolat#foglalasi-dij');
  await expect(page.getByRole('heading', { name: 'Speciális vizsgálatok foglalási díja' })).toBeInViewport();
});
