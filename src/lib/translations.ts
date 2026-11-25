import { getCollection } from 'astro:content';
import { inLocale, templatePages, type Locale } from './locale';

/**
 * Every translated page as its Hungarian and English path. An English content file names
 * the Hungarian file it translates in `translationKey` (that file's name, in the same folder),
 * the way the CMS pairs localized files.
 */
async function buildPairs() {
  const pairs = [...templatePages];
  const services = await getCollection('services');
  for (const service of services) {
    if (service.data.en?.path) pairs.push({ hu: service.data.path, en: service.data.en.path });
  }

  const site = await getCollection('site');
  const huSite = new Set(site.filter(inLocale('hu')).map((p) => p.id));
  for (const page of site.filter(inLocale('en'))) {
    const folder = page.filePath!.replace(/^src\/content\/site\/en\//, '').split('/').slice(0, -1);
    const hu = [...folder, page.data.translationKey].join('/');
    if (!page.data.translationKey || !huSite.has(hu)) throw new Error(`${page.filePath}: translationKey must name the Hungarian page it translates`);
    pairs.push({ hu: `/${hu}`, en: `/${page.id}` });
  }

  const exams = await getCollection('exams');
  const huExams = new Map(exams.filter(inLocale('hu')).map((e) => [e.id, e]));
  for (const exam of exams.filter(inLocale('en'))) {
    const [, folder] = exam.id.split('/');
    const hu = huExams.get(`${folder}/${exam.data.translationKey}`);
    const service = services.find((s) => s.id === exam.data.service.id);
    if (!hu || !service?.data.en?.path) throw new Error(`${exam.filePath}: translationKey must name the Hungarian exam it translates, of a service with an English path`);
    pairs.push({ hu: `${service.data.path}/${slugOf(hu)}`, en: `${service.data.en.path}/${slugOf(exam)}` });
  }

  for (const locale of ['hu', 'en'] as const) {
    const seen = new Set<string>();
    for (const pair of pairs) {
      if (seen.has(pair[locale])) throw new Error(`Two pages translate ${pair[locale]}`);
      seen.add(pair[locale]);
    }
  }
  return pairs;
}

let pairs: ReturnType<typeof buildPairs> | undefined;
const translations = () => (pairs ??= buildPairs());

const slugOf = (entry: { id: string }) => entry.id.split('/').at(-1)!;

/** The same page in the other language, when it has been translated. */
export async function counterpart(path: string, locale: Locale) {
  const other = locale === 'hu' ? 'en' : 'hu';
  return (await translations()).find((p) => p[locale] === path)?.[other];
}

/**
 * Links for a locale. Shared data (clinics, booking services, navigation) stores Hungarian
 * paths; on English pages a link leads to the page's English version when there is one,
 * and to the Hungarian page otherwise. A path that is already English passes through.
 */
export async function linker(locale: Locale) {
  const english = new Map((await translations()).map((p) => [p.hu, p.en]));
  return (href: string) => {
    if (locale === 'hu' || !href.startsWith('/')) return href;
    const [path = '', hash] = href.split('#');
    const target = english.get(path) ?? path;
    return hash === undefined ? target : `${target}#${hash}`;
  };
}
