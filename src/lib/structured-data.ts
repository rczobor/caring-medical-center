import type { CollectionEntry } from 'astro:content';

/**
 * schema.org data for search engines (JSON-LD). It restates what the page shows, from
 * the same content files, so the two can't disagree.
 */

const dayNames = { Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday' } as const;

/** The organization the clinics belong to; pages refer to it by this id. */
export const organizationId = (site: URL) => new URL('/#szervezet', site).href;

export function organization(site: URL, logo: string) {
  return { '@type': 'MedicalOrganization', '@id': organizationId(site), name: 'Caring Medical Center', url: new URL('/', site).href, logo: new URL(logo, site).href };
}

export function clinic({ data }: CollectionEntry<'clinics'>, site: URL) {
  const url = new URL(data.page, site).href;
  return {
    '@type': 'MedicalClinic',
    '@id': `${url}#rendelo`,
    name: data.name,
    url,
    telephone: data.phone,
    email: data.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: data.address.street,
      postalCode: data.address.postalCode,
      addressLocality: data.address.city,
      addressCountry: 'HU',
    },
    geo: { '@type': 'GeoCoordinates', latitude: data.geo.lat, longitude: data.geo.lng },
    openingHoursSpecification: data.hours.map(({ days, opens, closes }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days.map((d) => dayNames[d]),
      opens,
      closes,
    })),
    parentOrganization: { '@id': organizationId(site) },
  };
}

export function article({ title, date, url, image }: { title: string; date: Date; url: URL; image: string | undefined }, site: URL) {
  return {
    '@type': 'Article',
    headline: title,
    datePublished: date.toISOString().slice(0, 10),
    url: url.href,
    ...(image && { image }),
    publisher: { '@id': organizationId(site) },
  };
}

/** A `<script type="application/ld+json">` body; `<` is escaped so text can't close the tag. */
export const toJsonLd = (graph: object[]) => JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
