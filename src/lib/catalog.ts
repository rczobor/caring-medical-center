import { getCollection, type CollectionEntry } from 'astro:content';
import { formatHuf, formatMinutes } from './format';
import { inLocale, localize, type Locale } from './locale';
import { ui } from './ui';

type Service = CollectionEntry<'services'>;
type Exam = CollectionEntry<'exams'>;
type Price = CollectionEntry<'prices'>;

export const examPath = (service: Service, exam: Exam) => `${service.data.path}/${exam.id.split('/').at(-1)}`;

/** The clinics offering a bookable service, in clinic order, with how to book it at each. */
export async function bookingsFor(bookingServiceId: string) {
  const clinics = (await getCollection('clinics')).sort((a, b) => a.data.position - b.data.position);
  return clinics.flatMap((clinic) =>
    clinic.data.booking.filter((b) => b.service.id === bookingServiceId).map(({ system, url }) => ({ clinic, system, url })),
  );
}

export const resolveBookings = (service: Service) => bookingsFor(service.data.bookingService.id);

/** A service with its copy and path in the locale; its exam paths follow (examPath). */
export async function serviceIn(id: string, locale: Locale) {
  const service = (await getCollection('services')).find((s) => s.id === id);
  if (!service) throw new Error(`No service "${id}" in src/content/services.yaml`);
  return localize(service, locale);
}

/** A service's exam pages in the locale, by title. */
export const examsOf = async (service: Service, locale: Locale) =>
  (await getCollection('exams', (e) => e.data.service.id === service.id && inLocale(locale)(e))).sort((a, b) =>
    a.data.title.localeCompare(b.data.title, locale),
  );

/** getStaticPaths for a service's exam pages in a locale: /mrvizsgalat/[slug] or /en/mri/[slug]. */
export async function examPaths(serviceId: string, locale: Locale) {
  const exams = await getCollection('exams', (e) => e.data.service.id === serviceId && inLocale(locale)(e));
  return exams.map((exam) => ({ params: { slug: exam.id.split('/').at(-1) }, props: { exam } }));
}

/** "57 900 Ft" or "HUF 57,900", the lowest of the rows, or undefined when there are none. */
export const lowestPrice = (rows: Price[], locale: Locale) =>
  rows.length ? formatHuf(Math.min(...rows.map((r) => r.data.huf)), locale) : undefined;

/** "57 900 Ft-tól" or "from HUF 57,900", or undefined when there are no price rows. */
export function fromPrice(rows: Price[], locale: Locale) {
  const lowest = lowestPrice(rows, locale);
  const { before, after } = ui[locale].priceFrom;
  return lowest && `${before && `${before} `}${lowest}${after}`;
}

/**
 * The "from" price of the page at `path`, when it sells priced exams: an exam page
 * (its own rows) or a content page that shows a price list (that category).
 */
export async function fromPriceOfPage(path: string, locale: Locale) {
  const prices = await getCollection('prices', (p) => !p.data.extra);
  for (const { id } of await getCollection('services')) {
    const service = await serviceIn(id, locale);
    const exam = (await examsOf(service, locale)).find((e) => examPath(service, e) === path);
    if (exam) {
      const ids = new Set(exam.data.prices.map((p) => p.id));
      return fromPrice(prices.filter((p) => ids.has(p.id)), locale);
    }
  }
  const category = (await getCollection('site')).find((p) => `/${p.id}` === path)?.data.prices?.category;
  return category && fromPrice(prices.filter((p) => p.data.category === category), locale);
}

/** The four facts a patient decides on, shown under every service and exam title. */
export function decisionFacts(service: Service, rows: Price[], locale: Locale) {
  const minutes = rows.flatMap((r) => (r.data.minutes ? [r.data.minutes] : []));
  const t = ui[locale].facts;
  return [
    { label: t.price, value: fromPrice(rows, locale) ?? t.askByPhone },
    { label: t.time, value: minutes.length ? formatMinutes(locale, Math.min(...minutes), Math.max(...minutes)) : '–' },
    { label: t.result, value: service.data.resultTime },
    { label: t.referral, value: service.data.referral },
  ];
}
