import { file, glob } from 'astro/loaders';
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { parse } from 'yaml';
import { sitePageId } from './lib/locale';

/**
 * A YAML list loader that records each entry's place in the file. Collections
 * come back sorted by id, but for price lists and clinics the file order is the
 * order people should see, so pages sort by `position` instead.
 */
const orderedFile = (path: string) =>
  file(path, {
    parser: (text) => {
      const entries: unknown = parse(text);
      if (!Array.isArray(entries)) throw new Error(`${path} must be a YAML list`);
      return entries.map((entry, position) => ({ ...entry, position }));
    },
  });
const position = z.number().int();

// Data shared by both languages (prices, clinics, doctors…) keeps its English text in an
// `en` object on the same entry, so a number or a link can't differ between the two.
// English Markdown and page copy live in files of their own under an `en/` folder; see
// src/content/README.md.

/** An English page's Hungarian original: that file's name, in the same folder. Hungarian pages have none. */
const translationKey = z.string().regex(/^[a-z0-9-]+$/).optional();

const time = z.string().regex(/^\d{2}:\d{2}$/);
const phone = z.string().regex(/^\+36\d{8,9}$/, 'E.164 format, e.g. +3618009771');

/** What patients can book, and the page that describes it. */
const bookingServices = defineCollection({
  loader: orderedFile('src/content/booking-services.yaml'),
  schema: z.object({
    name: z.string(),
    note: z.string().optional(),
    page: z.string().startsWith('/'),
    en: z.strictObject({ name: z.string(), note: z.string().optional() }).optional(),
    position,
  }),
});

const clinics = defineCollection({
  loader: orderedFile('src/content/clinics.yaml'),
  schema: z.object({
    name: z.string(),
    address: z.strictObject({ street: z.string(), postalCode: z.string(), city: z.string() }),
    phone,
    otherPhone: phone.optional(),
    email: z.email(),
    geo: z.object({ lat: z.number(), lng: z.number() }),
    hours: z.array(
      z.strictObject({
        days: z.array(z.enum(['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])).min(1),
        opens: time,
        closes: time,
        note: z.string().optional(),
        en: z.strictObject({ note: z.string() }).optional(),
      }),
    ),
    /** The clinic's introduction page on this site. Its `image` is the clinic's photo. */
    page: z.string().startsWith('/'),
    /** What this clinic offers for booking, and where each is booked. */
    booking: z.array(z.strictObject({ service: reference('bookingServices'), system: z.string(), url: z.url() })),
    position,
  }),
});

/** One row of the price list. Exam pages and the price page both read these. */
const prices = defineCollection({
  loader: orderedFile('src/content/prices.yaml'),
  schema: z.object({
    category: z.enum(['rtg', 'mr', 'ct', 'rehab']),
    name: z.string(),
    minutes: z.number().int().positive().optional(),
    huf: z.number().int().positive(),
    /** Price unit beyond the default per exam, e.g. "/óra". */
    unit: z.string().optional(),
    /** Surcharges and add-ons, listed after the exams. */
    extra: z.boolean().default(false),
    en: z.strictObject({ name: z.string(), unit: z.string().optional() }).optional(),
    position,
  }),
});

// Nested content objects are strict: in YAML's inline `{ … }` syntax an unquoted
// comma ends a value, and the rest of the sentence silently becomes an unknown key.
const textBlock = z.strictObject({ title: z.string(), text: z.string() });

/** A diagnostic service's copy, in either language. */
const serviceText = {
  name: z.string(),
  imageAlt: z.string().min(10),
  resultTime: z.string(),
  referral: z.string(),
  steps: z.array(textBlock).min(1),
  photoAlt: z.string().min(10),
  precautionsTitle: z.string(),
  precautions: z.array(textBlock),
  /** Shown with the prices of services whose exams have contrast variants. */
  contrastNote: z.string().optional(),
  /** The service's own overview page, e.g. /mrvizsgalat. */
  overview: z
    .object({
      title: z.string(),
      description: z.string(),
      examsTitle: z.string(),
      examsIntro: z.string(),
      about: z.array(textBlock),
      advantagesTitle: z.string(),
      advantages: z.array(textBlock),
      indicationsTitle: z.string(),
      indications: z.array(textBlock),
    })
    .optional(),
};

/** A diagnostic service (MR, CT, …): what all of its exam pages share. */
const services = defineCollection({
  loader: file('src/content/services.yaml'),
  schema: ({ image }) =>
    z.object({
      ...serviceText,
      path: z.string().startsWith('/'),
      image: image(),
      /** Clinics offering it, and how to book, come from clinics.yaml through this. */
      bookingService: reference('bookingServices'),
      photo: image(),
      /** Its exams can need a booking deposit (the "foglalasi-dij" note). */
      deposit: z.boolean().default(false),
      /** The English copy, served under `path`, e.g. /en/mri. */
      en: z.strictObject({ ...serviceText, path: z.string().startsWith('/en/') }).optional(),
    }),
});

/** Copy for pages that are mostly generated from data, such as a price list. */
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heading: z.string(),
    lead: z.string().optional(),
    mrNote: z.string().optional(),
  }),
});

/** One exam page, e.g. /mrvizsgalat/terdizuleti-mr. The Markdown body is its own copy. */
const exams = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/exams' }),
  schema: z.object({
    title: z.string(),
    translationKey,
    service: reference('services'),
    // The CMS leaves an empty list out of the file.
    prices: z.array(reference('prices')).default([]),
  }),
});

const link = z.strictObject({ name: z.string(), page: z.string().startsWith('/') });

const faq = z.strictObject({
  title: z.string(),
  items: z.array(z.strictObject({ question: z.string(), answer: z.string() })).min(1),
});

/**
 * The homepage's copy; services, prices and clinics come from their own collections.
 * The file is the page's object itself, without an id, so the CMS edits it as one form.
 * en/home.yaml is the English homepage.
 */
const home = defineCollection({
  loader: glob({ pattern: ['home.yaml', 'en/home.yaml'], base: 'src/content' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      heading: z.string(),
      lead: z.string(),
      /** The photo a shared link shows (Open Graph); the hero shows the MR service's photo. */
      image: image(),
      /** "Miben segíthetünk?": complaint pages first, then shortcuts for common questions. */
      helpTitle: z.string(),
      helpIntro: z.string(),
      complaints: z.array(link.extend({ text: z.string() })).min(1),
      shortcuts: z.array(link.extend({ text: z.string() })),
      diagnosticsTitle: z.string(),
      diagnostics: z.array(
        z.strictObject({
          title: z.string(),
          text: z.string(),
          page: z.string().startsWith('/'),
          /** Price list category for a "from" price, when the price list has one. */
          prices: z.enum(['rtg', 'mr', 'ct']).optional(),
        }),
      ),
      aboutTitle: z.string(),
      aboutText: z.string(),
      stats: z.array(z.strictObject({ value: z.string(), label: z.string(), text: z.string() })),
      specialtiesTitle: z.string(),
      specialtiesIntro: z.string(),
      specialties: z.array(link),
      rehabLabel: z.string(),
      rehabTitle: z.string(),
      rehabIntro: z.string(),
      rehab: z.array(link),
      testimonialsTitle: z.string(),
      testimonials: z.array(z.string()),
    }),
});

/**
 * The MoveWell programme page (/movewell). Its copy is the live page's, kept as data
 * so the page can show it as benefits, steps, programmes and a day plan.
 */
const movewell = defineCollection({
  loader: file('src/content/movewell.yaml'),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      eyebrow: z.string(),
      heading: z.string(),
      lead: z.string(),
      image: image(),
      imageAlt: z.string().min(10),
      phone,
      benefitsTitle: z.string(),
      benefits: z.array(textBlock).min(1),
      stepsTitle: z.string(),
      steps: z.array(z.string()).min(1),
      programsTitle: z.string(),
      programs: z.array(z.strictObject({ name: z.string(), text: z.string(), cta: link })).min(1),
      /** Under the programmes, beside the phone number. */
      bookingPrompt: z.string(),
      dayTitle: z.string(),
      day: z.array(z.strictObject({ time: z.string().regex(/^\d{2}:\d{2}–\d{2}:\d{2}$/), title: z.string(), text: z.string() })).min(1),
      teamTitle: z.string(),
      team: z.array(z.strictObject({ name: z.string(), role: z.string(), photo: image() })).min(1),
      faq,
    }),
});

/** Text shared by several pages, such as the booking deposit terms. */
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/notes' }),
  schema: z.object({
    title: z.string(),
    lead: z.string().optional(),
    /** Markdown shown where the full text would be too long; the body continues it. */
    summary: z.string(),
  }),
});

/** Doctors on the specialty pages. A page lists the ones it shows in its `doctors` frontmatter. */
const doctors = defineCollection({
  loader: file('src/content/doctors.yaml'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      photo: image().optional(),
      /** The doctor's own booking page, shown as "Online foglalás". */
      booking: z.url().optional(),
      /** A profile page, linked from the name. */
      profile: z.url().optional(),
      en: z.strictObject({ role: z.string() }).optional(),
    }),
});

/**
 * The live site's content pages (specialties, rehabilitation, news…), rendered by
 * src/pages/[...slug].astro. The id is the URL path, so the file name decides where a
 * page is served. An English page's folder
 * keeps its Hungarian name and its URL takes the English one (sitePageId).
 */
const site = defineCollection({
  loader: glob({ pattern: '**/*.md', base: 'src/content/site', generateId: ({ entry }) => sitePageId(entry) }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      translationKey,
      /** Falls back to the first paragraph of the body. */
      description: z.string().optional(),
      heading: z.string(),
      /** The short label set above the heading, e.g. "Rehabilitáció". */
      eyebrow: z.string().optional(),
      image: image().optional(),
      /** Empty for a decorative picture. */
      imageAlt: z.string().default(''),
      /** News articles only. */
      date: z.coerce.date().optional(),
      /** Adds the booking panel for this service. */
      bookingService: reference('bookingServices').optional(),
      /** The doctors to show, in order, in a panel beside the copy. */
      doctors: z.array(reference('doctors')).optional(),
      /** A note under the doctors, such as who provides the service. */
      doctorsNote: z.string().optional(),
      /** Shows this price list category next to the booking panel. */
      prices: z.strictObject({ category: z.enum(['rtg', 'mr', 'ct', 'rehab']), title: z.string() }).optional(),
      /**
       * Each price list's cheapest exam, as "… Ft-tól", in a row before the copy. Lets the
       * prices index answer "how much?" before a patient opens a list.
       */
      fromPrices: z
        .array(z.strictObject({ category: z.enum(['rtg', 'mr', 'ct', 'rehab']), label: z.string(), page: z.string().startsWith('/') }))
        .min(1)
        .optional(),
      /** Questions and answers shown after the copy. `answer` is Markdown. */
      faq: faq.optional(),
      /**
       * A complaint page's route through the clinic, e.g. exam → specialist → treatment,
       * shown as numbered steps after the copy. A link to a priced page shows its "from" price.
       */
      pathway: z.array(z.strictObject({ title: z.string(), text: z.string(), links: z.array(link).min(1) })).min(1).optional(),
      /** The live page this was ported from, for checking the copy. Pages written since have none. */
      source: z.string().startsWith('/').optional(),
    }),
});

export const collections = { bookingServices, clinics, prices, services, exams, pages, notes, home, movewell, doctors, site };
