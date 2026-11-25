import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const DIST = path.join(import.meta.dirname, '..', 'dist');

/** `site` in astro.config.mjs: canonical and share URLs start with it. */
export const SITE = 'https://caringmedical-site.czobor94.workers.dev';

/**
 * Every built page as the path it's served at (build.format is 'file': a/b.html → /a/b).
 * Redirect stubs for retired URLs are left out; redirects.spec.ts covers them. So is
 * the CMS at /admin, which is an app for editors, not a page of the site.
 */
export const routes = readdirSync(DIST, { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('.html') && file !== '404.html' && !file.startsWith(`admin${path.sep}`))
  .filter((file) => !readFileSync(path.join(DIST, file), 'utf8').includes('http-equiv="refresh"'))
  .map((file) => '/' + file.split(path.sep).join('/').replace(/\.html$/, '').replace(/^index$/, ''))
  .sort();

export const fileFor = (route: string) => path.join(DIST, route === '/' ? 'index.html' : `${route.slice(1)}.html`);
