import { expect, test } from '@playwright/test';

// The live pages keep these answers in their JavaScript, opened on click; the first
// port lost them and showed bare questions.
for (const [path, question, answer] of [
  ['/movewell', 'Kell-e beutaló a vizsgálathoz?', /^Nem, beutaló nem szükséges\./],
  ['/movewell', 'Biztosító/finanszírozás opciók?', /Egészségpénztári partnereink/],
  ['/caringmedical-buda-bemutato', 'Hol tudok parkolni?', /^A környező utcákban lehetséges parkolni/],
] as const) {
  test(`${path} answers "${question}"`, async ({ page }) => {
    await page.goto(path);
    const faq = page.getByRole('region', { name: /Gyakran ismételt kérdések/i });
    await expect(faq.getByRole('term').filter({ hasText: question }).locator('xpath=following-sibling::dd[1]')).toHaveText(answer);
  });
}
