/**
 * The CMS writes only the fields its config defines, so a key the config misses
 * would silently disappear from a file on the next save. These checks read the
 * content files directly; no browser needed.
 */
import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

type Field = {
  name: string;
  widget?: string;
  /** Unset or false: Hungarian only, so the English file doesn't have it. */
  i18n?: boolean | 'duplicate';
  required?: boolean;
  root?: boolean;
  fields?: Field[];
  field?: Field;
  collection?: string;
  file?: string;
};
type Media = { media_folder?: string; public_folder?: string };
type CollectionFile = Media & { name: string; file: string; fields: Field[] };
type Collection = Media & {
  name: string;
  readonly?: boolean;
  folder?: string;
  files?: CollectionFile[];
  fields?: Field[];
  slug?: string | { i18n?: boolean };
};

const ROOT = path.join(import.meta.dirname, '..');
const config: Media & { collections: Collection[]; i18n: { locales: string[] } } = parse(
  readFileSync(path.join(ROOT, 'public/admin/config.yml'), 'utf8'),
);
const editable = config.collections.filter((c) => !c.readonly);
expect(config.i18n.locales).toEqual(['hu', 'en']);

/**
 * A path with `{{locale}}` for one language: Hungarian files keep the path without it
 * (omit_default_locale_from_file_path), English ones sit in the en/ folder there.
 */
const inLocale = (p: string, locale: string) => p.replace('/{{locale}}', locale === 'hu' ? '' : `/${locale}`);

/** The fields an English file holds: the CMS leaves out the rest, which stay Hungarian. */
const translated = (fields: Field[]): Field[] =>
  fields
    .filter((f) => f.i18n)
    .map((f) => (f.i18n === true && f.fields ? { ...f, fields: translated(f.fields) } : f));

type Document = {
  file: string;
  locale: string;
  data: unknown;
  /** The Markdown body, for a Markdown entry. */
  body: string | undefined;
  fields: Field[];
  media: Media;
};

/** Every document the CMS can save, with the fields and media settings that apply to it. */
const documents = editable.flatMap((c): Document[] => {
  const locales = (c.folder ?? c.files![0]!.file).includes('{{locale}}') ? config.i18n.locales : ['hu'];
  return locales.flatMap((locale): Document[] => {
    const fieldsOf = (fields: Field[]) => (locale === 'hu' ? fields : translated(fields));
    if (c.folder) {
      const folder = inLocale(c.folder, locale);
      // With a localized slug, the CMS links a page's two files by a translationKey in each.
      const slugged = typeof c.slug === 'object' && c.slug.i18n === true;
      const fields = [...fieldsOf(c.fields!), ...(slugged ? [{ name: 'translationKey', required: false }] : [])];
      return readdirSync(path.join(ROOT, folder))
        .filter((f) => f.endsWith('.md'))
        .map((f) => {
          const file = path.join(folder, f);
          const [, frontmatter, ...body] = readFileSync(path.join(ROOT, file), 'utf8').split(/^---$/m);
          return { file, locale, data: parse(frontmatter!) as unknown, body: body.join('---'), fields, media: { ...config, ...c } };
        });
    }
    return c.files!.map((f) => {
      const file = inLocale(f.file, locale);
      const raw: unknown = parse(readFileSync(path.join(ROOT, file), 'utf8'));
      const [only] = f.fields;
      // A root list field is the whole file, saved without its own key.
      const data = f.fields.length === 1 && only!.root ? { [only!.name]: raw } : raw;
      return { file, locale, data, body: undefined, fields: fieldsOf(f.fields), media: { ...config, ...c, ...f } };
    });
  });
});

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Keys in `value` that no field describes, as dotted paths. */
function unknownKeys(value: unknown, fields: Field[], at: string): string[] {
  if (!isRecord(value)) return [`${at} is not an object`];
  return Object.entries(value).flatMap(([key, v]) => {
    const field = fields.find((f) => f.name === key);
    const here = at ? `${at}.${key}` : key;
    if (!field) return [here];
    if (field.widget === 'object' && field.fields) return unknownKeys(v, field.fields, here);
    if (field.widget === 'list' && field.fields && Array.isArray(v)) return v.flatMap((item, i) => unknownKeys(item, field.fields!, `${here}[${i}]`));
    return [];
  });
}

/** Values of image fields, with the dotted path they sit at. */
function images(value: unknown, fields: Field[], at = ''): [string, string][] {
  if (!isRecord(value)) return [];
  return fields.flatMap((field) => {
    const v = value[field.name];
    const here = at ? `${at}.${field.name}` : field.name;
    if (field.widget === 'image' && typeof v === 'string') return [[here, v] as [string, string]];
    if (field.widget === 'object' && field.fields) return images(v, field.fields, here);
    if (field.widget === 'list' && field.fields && Array.isArray(v)) return v.flatMap((item, i) => images(item, field.fields!, `${here}[${i}]`));
    return [];
  });
}

test('every collection points at existing content, in both languages where it is translated', () => {
  for (const c of config.collections) {
    for (const p of c.folder ? [c.folder] : c.files!.map((f) => f.file)) {
      const paths = p.includes('{{locale}}') ? config.i18n.locales.map((l) => inLocale(p, l)) : [p];
      for (const one of paths) expect(existsSync(path.join(ROOT, one)), `${c.name}: ${one}`).toBe(true);
    }
  }
  for (const c of editable.filter((c) => c.folder)) {
    for (const l of c.folder!.includes('{{locale}}') ? config.i18n.locales : ['hu']) {
      expect(documents.some((d) => path.dirname(d.file) === inLocale(c.folder!, l)), `${c.name} (${l})`).toBe(true);
    }
  }
});

test('every key in an editable file has a field, so a save keeps it', () => {
  const missing = documents.flatMap((d) => unknownKeys(d.data, d.fields, '').map((k) => `${d.file}: ${k}`));
  expect(missing).toEqual([]);
});

/** Required fields left empty, as dotted paths. The CMS won't save an entry until they're filled. */
function emptyRequired(value: unknown, fields: Field[], at: string): string[] {
  if (!isRecord(value)) return [];
  return fields.flatMap((field) => {
    if (field.required === false || field.widget === 'boolean' || field.widget === 'hidden') return [];
    const v = value[field.name];
    const here = at ? `${at}.${field.name}` : field.name;
    if (v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)) return [here];
    if (field.widget === 'object' && field.fields) return emptyRequired(v, field.fields, here);
    if (field.widget === 'list' && field.fields && Array.isArray(v)) return v.flatMap((item, i) => emptyRequired(item, field.fields!, `${here}[${i}]`));
    return [];
  });
}

test('every required field has a value, so an entry can be saved as it is', () => {
  const empty = documents.flatMap((d) => {
    // A folder collection's body field is the Markdown body.
    const data = d.body === undefined || !isRecord(d.data) ? d.data : { ...d.data, body: d.body };
    return emptyRequired(data, d.fields, '').map((k) => `${d.file}: ${k}`);
  });
  expect(empty).toEqual([]);
});

test('relation fields point at a configured collection and file', () => {
  const relations = config.collections.flatMap((c) => [...(c.fields ?? []), ...(c.files ?? []).flatMap((f) => f.fields)]).filter((f) => f.widget === 'relation');
  expect(relations.length).toBeGreaterThan(0);
  for (const r of relations) {
    const target = config.collections.find((c) => c.name === r.collection);
    expect(target, `${r.name} → ${r.collection}`).toBeDefined();
    if (r.file) expect(target!.files?.some((f) => f.name === r.file), `${r.name} → ${r.collection}/${r.file}`).toBe(true);
  }
});

// The CMS uploads to media_folder and writes public_folder + file name, which Astro
// resolves through the tsconfig.json alias, in fields and in Markdown bodies alike.
// Existing images must follow the same rule, or the CMS would show them broken and
// write new ones where the build can't find them.
const ALIAS = { prefix: '@assets/', folder: 'src/assets/' };
test('image paths match each collection’s media settings', () => {
  const problems = documents.flatMap((d) => {
    const { media_folder, public_folder } = d.media;
    const found = [
      ...images(d.data, d.fields),
      ...[...(d.body ?? '').matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((m): [string, string] => ['body', m[1]!]),
    ];
    if (!media_folder || !public_folder?.startsWith(ALIAS.prefix)) return [`${d.file}: media settings ${media_folder} → ${public_folder}`];
    const uploads = path.join(ROOT, media_folder);
    const written = path.join(ROOT, public_folder.replace(ALIAS.prefix, ALIAS.folder));
    return [
      ...(written === uploads ? [] : [`${d.file}: public_folder resolves to ${path.relative(ROOT, written)}, not ${media_folder}`]),
      ...found
        .filter(([, v]) => !(v.startsWith(`${public_folder}/`) && existsSync(path.join(ROOT, v.replace(ALIAS.prefix, ALIAS.folder)))))
        .map(([at, v]) => `${d.file}: ${at} = ${v}`),
    ];
  });
  expect(problems).toEqual([]);
});

/** A document's value at a dotted path of top-level and object fields. */
const valueAt = (data: unknown, name: string) => (isRecord(data) ? data[name] : undefined);

// The CMS copies a `duplicate` field from the Hungarian file into the English one on
// every save. A value that differs today would silently change on the first save.
test('fields shared by both languages already match in the English file', () => {
  const byFile = new Map(documents.map((d) => [d.file, d]));
  const mismatches = documents
    .filter((d) => d.locale === 'en')
    .flatMap((en) => {
      const key = valueAt(en.data, 'translationKey');
      const huFile = path.join(path.dirname(en.file).replace(/\/en(?=\/|$)/, ''), typeof key === 'string' ? `${key}.md` : path.basename(en.file));
      const hu = byFile.get(huFile);
      if (!hu) return [`${en.file}: no Hungarian file ${huFile}`];
      return hu.fields
        .filter((f) => f.i18n === 'duplicate')
        .filter((f) => JSON.stringify(valueAt(en.data, f.name)) !== JSON.stringify(valueAt(hu.data, f.name)))
        .map((f) => `${en.file}: ${f.name}`);
    });
  expect(mismatches).toEqual([]);
});
