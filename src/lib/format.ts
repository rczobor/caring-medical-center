import type { Locale } from './locale';

/** "+3618009771" → "+36 1 800 9771", "+36703431912" → "+36 70 343 1912" (Hungarian grouping). */
export function formatPhone(e164: string): string {
  const national = e164.replace(/^\+36/, '');
  const area = national.startsWith('1') ? national.slice(0, 1) : national.slice(0, 2);
  const rest = national.slice(area.length);
  return `+36 ${area} ${rest.slice(0, 3)} ${rest.slice(3)}`;
}

const grouping = { hu: new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 0 }), en: new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }) };

/** 57900 → "57 900 Ft" or "HUF 57,900", with no-break spaces so a price never wraps. */
export function formatHuf(amount: number, locale: Locale): string {
  const figure = grouping[locale].format(amount).replace(/\s/g, '\u00a0');
  return locale === 'hu' ? `${figure}\u00a0Ft` : `HUF\u00a0${figure}`;
}

/** [20, 50] → "20–50 perc" or "20–50 min", [20, 20] → "20 perc". */
export function formatMinutes(locale: Locale, min: number, max = min): string {
  const unit = locale === 'hu' ? 'perc' : 'min';
  return min === max ? `${min}\u00a0${unit}` : `${min}–${max}\u00a0${unit}`;
}

const dayNames = {
  hu: { Mo: 'hétfő', Tu: 'kedd', We: 'szerda', Th: 'csütörtök', Fr: 'péntek', Sa: 'szombat', Su: 'vasárnap' },
  en: { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' },
};
type Day = keyof (typeof dayNames)['hu'];

/** "hétfő–péntek" or "Monday–Friday", or one day's name. */
export function formatDays(days: Day[], locale: Locale) {
  const names = dayNames[locale];
  return days.length > 1 ? `${names[days[0]!]}–${names[days.at(-1)!]}` : names[days[0]!];
}

/** { days: [Mo…Fr], opens: '08:00', closes: '20:00' } → "hétfő–péntek: 08:00–20:00". Days are consecutive in the data. */
export function formatHours(
  { days, opens, closes, note, en }: { days: Day[]; opens: string; closes: string; note?: string | undefined; en?: { note: string } | undefined },
  locale: Locale,
): string {
  const shown = locale === 'en' ? (en?.note ?? note) : note;
  return `${formatDays(days, locale)}: ${opens}–${closes}${shown ? ` (${shown})` : ''}`;
}

/** "2023. november 28." A YYYY-MM-DD date is midnight UTC, the same day in Budapest. */
export const formatDate = (date: Date, locale: Locale) => new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'hu-HU', { dateStyle: 'long', timeZone: 'Europe/Budapest' }).format(date);

/** A Google Maps directions link. A plain link: nothing from Google loads until the patient follows it. */
export const directionsUrl = ({ street, postalCode, city }: { street: string; postalCode: string; city: string }) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${street}, ${postalCode} ${city}`)}`;
