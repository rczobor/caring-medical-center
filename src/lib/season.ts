/**
 * Whether the home hero wears its Christmas look: 1 December to 6 January, by the date in
 * Budapest, whatever the visitor's own time zone. `override` is the page's `?season=` value:
 * "christmas" and "off" force it, for previews and tests; anything else is ignored.
 *
 * HolidayDecor.astro inlines this function's source into the page, where it runs in the browser
 * on each visit (the site is static, so only the browser knows today's date). It must therefore
 * use nothing outside its own body.
 */
export function isChristmas(now: Date, override?: string | null): boolean {
  if (override === 'christmas') return true;
  if (override === 'off') return false;
  // "12-01": month and day, which compare as text.
  const monthDay = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Budapest', month: '2-digit', day: '2-digit' });
  return monthDay >= '12-01' || monthDay <= '01-06';
}
