// @ts-check
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { satteri } from '@astrojs/markdown-satteri';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';
import * as pagefind from 'pagefind';
import { parse } from 'yaml';
import urlPlan from './migration/url-plan.json' with { type: 'json' };
import { siteSections, templatePages } from './src/lib/locale.ts';
import { markdownImageSizes } from './src/lib/markdown-images.ts';

const retired = urlPlan.filter((e) => e.action === 'redirect');

/** @type {{ path: string, en?: { path: string } }[]} */
const services = parse(readFileSync('src/content/services.yaml', 'utf8'));

// The CMS previews an English page at its Hungarian path under /en (/en/szakrendelesek/cardiology,
// /en/kapcsolat): it builds the link from the folder or file name, and only English URLs use
// English words. These lead such a path to the page, as a visitor who adds /en by hand expects too.
const englishAliases = [
  ...Object.entries(siteSections).map(([hu, en]) => ({ from: `/en/${hu}/*`, to: `/en/${en}/:splat` })),
  ...services.flatMap(({ path, en }) => (en ? [{ from: `/en${path}/*`, to: `${en.path}/:splat` }] : [])),
  ...templatePages.filter(({ hu, en }) => hu !== '/' && `/en${hu}` !== en).map(({ hu, en }) => ({ from: `/en${hu}`, to: en })),
];

// Every old URL the plan retires (merged duplicates, accented slugs, pages folded
// into another) moves permanently to its new home. A static build turns these into
// meta-refresh pages, the host-agnostic fallback. Keys are decoded: hosts decode
// the request path before looking up a file, so /hirek/%C3%BAj-… finds /hirek/új-….
const redirects = Object.fromEntries(
  retired.map((e) => [decodeURIComponent(e.from), { status: /** @type {const} */ (301), destination: e.to }]),
);

// Cloudflare's assets server applies `_redirects` before it looks for a file, so
// the same URLs get a real 301 there instead of a 200 meta-refresh page. Sources
// stay percent-encoded: that is how the rules are matched against the request.
/** @type {import('astro').AstroIntegration} */
const cloudflareRedirects = {
  name: 'cloudflare-redirects',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const rules = [...retired.map((e) => `${e.from} ${e.to} 301`), ...englishAliases.map((e) => `${e.from} ${e.to} 302`)];
      await writeFile(new URL('_redirects', dir), rules.map((rule) => `${rule}\n`).join(''));
    },
  },
};

// Site search (/kereses, /en/search) runs in the browser on a static index Pagefind builds from the
// finished pages: no search server, and nothing leaves the site. Only a page's
// `data-pagefind-body` (its <main>, see Base.astro) is indexed, so redirect stubs, the
// header and the footer stay out.
/** @type {import('astro').AstroIntegration} */
const searchIndex = {
  name: 'search-index',
  hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      // One index per language, from each page's <html lang>: Hungarian pages get Hungarian
      // stemming ("térdfájdalom" also finds "térdfájdalmak"), and the search page loads the
      // index of its own language, so /en/search finds only English pages.
      try {
        const { index, errors } = await pagefind.createIndex();
        if (!index) throw new Error(`Pagefind: ${errors.join('; ')}`);
        const added = await index.addDirectory({ path: fileURLToPath(dir) });
        const written = await index.writeFiles({ outputPath: fileURLToPath(new URL('pagefind/', dir)) });
        const problems = [...added.errors, ...written.errors];
        if (problems.length) throw new Error(`Pagefind: ${problems.join('; ')}`);
        logger.info(`search index built from ${added.page_count} files`);
      } finally {
        await pagefind.close();
      }
    },
  },
};

export default defineConfig({
  site: 'https://caringmedicalcenter.hu',
  // Keep the current site's URL shape (/mrvizsgalat/emlo-mr, no trailing slash)
  // so existing search rankings and links carry over without a redirect.
  trailingSlash: 'never',
  build: { format: 'file' },
  redirects,
  // A repeated price or doctor ID fails the build instead of quietly replacing a row.
  // The CMS then shows the edit's preview as failed. It doesn't block Publish, but a
  // failed build on main leaves the live site on its last good deploy.
  prerenderConflictBehavior: 'error',
  integrations: [cloudflareRedirects, searchIndex],
  // Pictures in Markdown get a srcset sized to where they sit (src/lib/markdown-images.ts).
  markdown: { processor: satteri({ hastPlugins: [markdownImageSizes] }) },
  // Sharp, plus exact focal-point crops for phones (src/components/Photo.astro).
  image: { service: { entrypoint: './src/lib/image-service.ts' } },
  fonts: [
    {
      // One family for the whole site (the previous site mixed eight), chosen by
      // the owner. Hungarian ő and ű live in the latin-ext subset.
      provider: fontProviders.fontsource(),
      name: 'Source Sans 3',
      cssVariable: '--font-source-sans',
      weights: ['400 700'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    {
      // The home page's display face, for its large headlines only (home redesign, direction A).
      provider: fontProviders.fontsource(),
      name: 'Instrument Sans',
      cssVariable: '--font-instrument',
      weights: ['400 700'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
