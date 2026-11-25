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
  // Read as numbers, not as formatted text: a browser's date format can change between versions.
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Budapest', month: 'numeric', day: 'numeric' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const month = part('month');
  return month === 12 || (month === 1 && part('day') <= 6);
}
