import { expect, test } from '@playwright/test';

test('site search finds pages by what a patient types, and the query stays in the URL', async ({ page }) => {
  await page.goto('/kereses');
  // Without accents, as many people type on a phone.
  await page.getByLabel('Mit keres?').fill('terdfajdalom');
  const results = page.getByRole('list', { name: 'Találatok' });
  await expect(results.getByRole('link', { name: /^Fáj a térde\?/ })).toHaveAttribute('href', '/panaszok/terdfajdalom');
  await expect(results.locator('mark').first()).toBeVisible();
  await expect(page).toHaveURL('/kereses?q=terdfajdalom');

  // A doctor's surname finds the doctors directory, from a shared link.
  await page.goto('/kereses?q=Berkes');
  await expect(page.getByLabel('Mit keres?')).toHaveValue('Berkes');
  await expect(results.getByRole('link', { name: /^Orvosaink/ })).toHaveAttribute('href', '/orvosaink');
});

test('the English search finds English pages only', async ({ page }) => {
  await page.goto('/en/search?q=knee');
  const results = page.getByRole('list', { name: 'Results' });
  await expect(page.getByLabel('What are you looking for?')).toHaveValue('knee');
  await expect(results.getByRole('link', { name: /^Does your knee hurt\?/ })).toHaveAttribute('href', '/en/conditions/knee-pain');
  await expect(results.locator('a:not([href="/en"], [href^="/en/"])')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText(/ results?/);
});

test('a search with no results says so and suggests what to try', async ({ page }) => {
  await page.goto('/kereses?q=xyzzyqwerty');
  await expect(page.getByRole('status')).toHaveText(/^Nincs találat erre: „xyzzyqwerty”/);
  await expect(page.getByRole('list', { name: 'Találatok' })).toBeHidden();
});

test('the search page and the 404 page are not in the index', async ({ page }) => {
  const results = page.getByRole('list', { name: 'Találatok' });
  for (const [q, href] of [
    ['keresés', '/kereses'],
    ['nem található', '/404'],
  ]) {
    await page.goto(`/kereses?q=${encodeURIComponent(q!)}`);
    await expect(page.getByRole('status')).not.toBeEmpty();
    await expect(results.locator(`a[href="${href}"]`)).toHaveCount(0);
  }
});

test('clearing the box while a search is still loading leaves no stale results', async ({ page }) => {
  // Slow result loading, so the search for "terd" is still running when the box is cleared.
  await page.route('**/pagefind/fragment/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await page.goto('/kereses');
  const box = page.getByLabel('Mit keres?');
  await box.fill('terd');
  await page.waitForTimeout(400);
  await box.fill('');
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL('/kereses');
  await expect(page.getByRole('list', { name: 'Találatok' })).toBeHidden();
  await expect(page.getByRole('status')).toBeEmpty();
});

test('when results fail to load, the page says so and drops the earlier results', async ({ page }) => {
  await page.goto('/kereses?q=terd');
  const results = page.getByRole('list', { name: 'Találatok' });
  await expect(results).toBeVisible();
  await page.route('**/pagefind/fragment/**', (route) => route.abort());
  await page.getByLabel('Mit keres?').fill('gerinc');
  await expect(page.getByRole('status')).toHaveText('A keresés most nem érhető el. Kérjük, próbálja újra később.');
  await expect(results).toBeHidden();
});
