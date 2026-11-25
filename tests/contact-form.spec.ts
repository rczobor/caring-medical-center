import { expect, test } from '@playwright/test';

const fill = async (page: import('@playwright/test').Page) => {
  await page.getByLabel('Teljes Név').fill('Teszt Elek');
  await page.getByLabel('Email cím').fill('teszt@pelda.hu');
  await page.getByLabel('Telefonszám').fill('+36 30 123 4567');
  await page.getByLabel('Üzenet').fill('Időpontot szeretnék kérni.');
  await page.getByLabel(/Elolvastam és elfogadom/).check();
};

test('an incomplete form explains each problem in Hungarian and focuses the first one', async ({ page }) => {
  await page.goto('/kapcsolat');
  await page.getByRole('button', { name: 'Üzenet Elküldése' }).click();
  await expect(page.getByLabel('Teljes Név')).toBeFocused();
  await expect(page.getByLabel('Teljes Név')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Kérjük, adja meg a nevét.')).toBeVisible();
  await expect(page.getByText('Az üzenet elküldéséhez el kell fogadnia az adatkezelési tájékoztatót.')).toBeVisible();

  await page.getByLabel('Email cím').fill('nem-email');
  await page.getByRole('button', { name: 'Üzenet Elküldése' }).click();
  await expect(page.getByText('Kérjük, ellenőrizze az email címet', { exact: false })).toBeVisible();
});

test('a valid message is posted as JSON and confirmed', async ({ page }) => {
  let body: unknown;
  await page.route('**/api/kapcsolat', async (route) => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 202, body: '{}' });
  });
  await page.goto('/kapcsolat');
  await fill(page);
  await page.getByLabel('Melyik rendelőnkbe jönne?').selectOption('Caring Medical Budaörs');
  await page.getByRole('button', { name: 'Üzenet Elküldése' }).click();
  await expect(page.getByText('Köszönjük, üzenetét megkaptuk.')).toBeVisible();
  expect(body).toEqual({
    name: 'Teszt Elek',
    email: 'teszt@pelda.hu',
    phone: '+36 30 123 4567',
    clinic: 'Caring Medical Budaörs',
    message: 'Időpontot szeretnék kérni.',
    consent: true,
    website: '',
    language: 'hu',
  });
});

test('without a working endpoint, sending fails honestly and offers the phone', async ({ page }) => {
  await page.goto('/kapcsolat');
  await fill(page);
  await page.getByRole('button', { name: 'Üzenet Elküldése' }).click();
  const status = page.getByRole('status').filter({ hasText: 'nem sikerült elküldeni' });
  await expect(status).toBeVisible();
  await expect(status.getByRole('link', { name: '+36 1 800 9771' })).toHaveAttribute('href', 'tel:+3618009771');
  await expect(page.getByText('Köszönjük, üzenetét megkaptuk.')).toBeHidden();
});
