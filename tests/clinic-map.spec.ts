import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const clinics: { name: string; page: string }[] = parse(readFileSync('src/content/clinics.yaml', 'utf8'));

for (const path of ['/', '/kapcsolat']) {
  test(`${path}: every clinic has a labelled marker on the overview map, linking to its page`, async ({ page }) => {
    await page.goto(path);
    const markers = page.getByRole('list', { name: 'Rendelőink a térképen' });
    for (const { name, page: href } of clinics) {
      await expect(markers.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  });
}

test('the clinic street map loads from Mapbox only when the visitor asks', async ({ page }) => {
  const requests: string[] = [];
  // A stand-in image: the test needs no network, and Mapbox sees nothing.
  await page.route('https://api.mapbox.com/**', (route) => {
    requests.push(route.request().url());
    return route.fulfill({ path: 'public/apple-touch-icon.png', contentType: 'image/png' });
  });
  await page.goto('/caringmedical-buda-bemutato');
  const map = page.locator('[data-street-map]');
  await map.scrollIntoViewIfNeeded();
  await expect(map.getByText('Caring Medical Buda')).toBeVisible();
  expect(requests).toEqual([]);

  const button = map.getByRole('button', { name: 'Utcatérkép betöltése' });
  // From the keyboard, so the test also covers where focus goes when the button disappears.
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(map.locator('img[src^="https://api.mapbox.com/"]')).toBeVisible();
  await expect(button).toHaveCount(0);
  // Only the pin stays, so the label doesn't cover the street names.
  await expect(map.getByText('Caring Medical Buda')).toHaveCount(0);
  await expect(map).toBeFocused();
  await expect(map).toHaveAccessibleName('Utcatérkép: Caring Medical Buda');
  expect(requests.length).toBeGreaterThan(0);
});

test('a clinic card and its marker light up together', async ({ page }) => {
  await page.goto('/');
  const group = page.locator('[data-clinic-group]');
  const marker = group.locator('.marker[data-clinic="buda"]');
  const card = group.locator('li[data-clinic="buda"]:not(.marker)');

  await card.getByRole('img').hover();
  await expect(marker).toHaveAttribute('data-active');
  await expect(group.locator('[data-active]')).toHaveCount(2);

  await page.getByRole('heading', { name: 'Rendelőink' }).hover();
  await expect(group.locator('[data-active]')).toHaveCount(0);

  // From the keyboard too: focusing the marker's link picks out the card.
  await marker.getByRole('link').focus();
  await expect(card).toHaveAttribute('data-active');
});

test.describe('the nearest clinic', () => {
  // Széll Kálmán tér, in Buda: the Buda clinic is nearest.
  test.use({ permissions: ['geolocation'], geolocation: { latitude: 47.5076, longitude: 19.0236 } });

  test('is found only when asked, then named and marked', async ({ page }) => {
    await page.goto('/kapcsolat');
    const group = page.locator('[data-clinic-group]');
    await expect(group.locator('[data-nearest]')).toHaveCount(0);

    await group.getByRole('button', { name: 'Melyik van hozzám legközelebb?' }).click();
    const answer = group.getByText(/^Önhöz legközelebb: Caring Medical Buda \(légvonalban kb\.\s[\d,]+\skm\)\.$/);
    await expect(answer).toBeVisible();
    // The name leads to the clinic's booking panel.
    await expect(answer.getByRole('link', { name: 'Caring Medical Buda' })).toHaveAttribute('href', '/caringmedical-buda-bemutato#foglalas');
    await expect(group.locator('.marker[data-nearest]')).toHaveAttribute('data-clinic', 'buda');
    const card = group.locator('section[data-clinic="buda"]');
    await expect(card).toHaveAttribute('data-nearest');
    await expect(card.getByText('Legközelebb Önhöz')).toBeVisible();
    // Nearest has its own marks; the title's gold bar stays hover's.
    await expect(card.locator('.link-bar')).toHaveCSS('background-size', '0px 3px');
  });
});

test("a clinic's panel names its metro stop when one is a short walk away", async ({ page }) => {
  await page.goto('/medicalpoint-bemutato');
  await expect(page.getByRole('region', { name: 'Foglalás és elérhetőség' })).toContainText('Metró: M3 Újpest-városkapu');
});

test('a street map that fails to load says so to screen readers too', async ({ page }) => {
  await page.route('https://api.mapbox.com/**', (route) => route.abort());
  await page.goto('/caringmedical-buda-bemutato');
  await page.getByRole('button', { name: 'Utcatérkép betöltése' }).click();
  await expect(page.getByRole('button', { name: 'Nem sikerült. Újra' })).toBeVisible();
  await expect(page.locator('[data-status]')).toHaveText('Az utcatérképet nem sikerült betölteni.');
});
