/**
 * The site's two languages. Hungarian keeps the live site's URLs; the English pages live
 * under /en with English slugs. Content files hold a page's copy in one language each:
 * the English ones sit in an `en/` folder beside the Hungarian ones (see src/content/README.md).
 */
export type Locale = 'hu' | 'en';

/**
 * The path a page is served at. The build renders pages as files (build.format), so it
 * reports the homepage as /index.html and other pages with .html: neither is the URL.
 */
export const pagePath = (url: URL) => url.pathname.replace(/\.html$/, '').replace(/^\/index$/, '/');

export const localeOf = (url: URL): Locale => (/^\/en(\/|\.html$|$)/.test(url.pathname) ? 'en' : 'hu');

/** The id of an entry's copy in a locale: `kapcsolat` in Hungarian, `en/kapcsolat` in English. */
export const localId = (id: string, locale: Locale) => (locale === 'hu' ? id : `en/${id}`);

/** Whether an entry of a mixed collection (site, exams, pages, notes) is in this locale. */
export const inLocale = (locale: Locale) => (entry: { id: string }) => entry.id.startsWith('en/') === (locale === 'en');

/**
 * A data entry (price, clinic, doctor…) as a locale shows it: on English pages its `en`
 * fields replace the Hungarian ones. Fields without an `en` value stay Hungarian, so an
 * untranslated row still shows rather than disappearing.
 */
export const localize = <T extends { data: { en?: object | undefined } }>(entry: T, locale: Locale) =>
  locale === 'en' && entry.data.en ? { ...entry, data: { ...entry.data, ...entry.data.en } } : entry;

/** Pages with their own template, by their Hungarian and English paths. Their route files must agree. */
export const templatePages = [
  { hu: '/', en: '/en' },
  { hu: '/kapcsolat', en: '/en/contact' },
  { hu: '/orvosaink', en: '/en/doctors' },
  { hu: '/rontgen-es-mr-arak', en: '/en/x-ray-and-mri-prices' },
  { hu: '/ct-arak', en: '/en/ct-prices' },
  { hu: '/rehabilitacio-es-szakrendeles-arak', en: '/en/rehabilitation-and-specialist-prices' },
  { hu: '/hirek', en: '/en/news' },
  { hu: '/movewell', en: '/en/movewell' },
  { hu: '/kereses', en: '/en/search' },
];

/**
 * The English URL of a Hungarian section folder in src/content/site. An English page at
 * src/content/site/en/szakrendelesek/cardiology.md is served at /en/specialist-clinics/cardiology:
 * the folder keeps its Hungarian name so the CMS can pair the two files (its `{{locale}}`
 * folder layout), and the URL takes the English one.
 */
export const siteSections: Record<string, string> = {
  szakrendelesek: 'specialist-clinics',
  rehabilitacio: 'rehabilitation',
  panaszok: 'conditions',
  hirek: 'news',
};

/** A site section's id prefix in a locale: `hirek` in Hungarian, `en/news` in English. */
export const sectionId = (folder: string, locale: Locale) => (locale === 'hu' ? folder : `en/${siteSections[folder]}`);

/** The site collection's id for a file: its URL path, with an English section name under en/. */
export function sitePageId(file: string) {
  const id = file.replace(/\.md$/, '');
  const [first, section, ...rest] = id.split('/');
  if (first !== 'en' || !section || !rest.length) return id;
  const english = siteSections[section];
  if (!english) throw new Error(`src/content/site/${file}: no English name for the "${section}" folder in siteSections`);
  return ['en', english, ...rest].join('/');
}
