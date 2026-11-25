import type { Locale } from './locale';

/**
 * The main navigation. Each item also owns the sections below it, so /mrvizsgalat/… marks
 * Diagnosztika as current. English items lead to the English page where there is one.
 */
export const nav: Record<Locale, { href: string; label: string; owns: string[] }[]> = {
  hu: [
    { href: '/diagnosztika', label: 'Diagnosztika', owns: ['/diagnosztika', '/mrvizsgalat', '/rontgenvizsgalat', '/ct-vizsgalatok', '/ultrahang', '/laborvizsgalatok', '/mammografia-vizsgalat', '/gerincgyogyaszat'] },
    { href: '/szakrendelesek/info', label: 'Szakrendelések', owns: ['/szakrendelesek'] },
    { href: '/rehabilitacio/info', label: 'Rehabilitáció', owns: ['/rehabilitacio'] },
    { href: '/orvosaink', label: 'Orvosaink', owns: ['/orvosaink'] },
    { href: '/arak', label: 'Árak', owns: ['/arak', '/rontgen-es-mr-arak', '/ct-arak', '/rehabilitacio-es-szakrendeles-arak'] },
    { href: '/kapcsolat', label: 'Kapcsolat', owns: ['/kapcsolat'] },
  ],
  en: [
    { href: '/en/diagnostics', label: 'Diagnostics', owns: ['/en/diagnostics', '/en/mri', '/en/x-ray', '/en/ct', '/en/ultrasound', '/en/laboratory-tests', '/en/mammography', '/en/spine-care'] },
    { href: '/en/specialist-clinics/overview', label: 'Specialists', owns: ['/en/specialist-clinics'] },
    { href: '/en/rehabilitation/overview', label: 'Rehabilitation', owns: ['/en/rehabilitation'] },
    { href: '/en/doctors', label: 'Doctors', owns: ['/en/doctors'] },
    { href: '/en/prices', label: 'Prices', owns: ['/en/prices', '/en/x-ray-and-mri-prices', '/en/ct-prices', '/en/rehabilitation-and-specialist-prices'] },
    { href: '/en/contact', label: 'Contact', owns: ['/en/contact'] },
  ],
};

export const owned = (owns: string[], path: string) => owns.some((p) => path === p || path.startsWith(`${p}/`));

/** The section page above a path, for breadcrumbs; none for a section page itself or a top-level page. */
export function parentOf(path: string, locale: Locale) {
  const news = locale === 'hu' ? { label: 'Hírek', href: '/hirek' } : { label: 'News', href: '/en/news' };
  if (path.startsWith(`${news.href}/`)) return news;
  const item = nav[locale].find(({ href, owns }) => href !== path && owned(owns, path));
  return item && { label: item.label, href: item.href };
}
