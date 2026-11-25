/**
 * Go-live gate: every URL of the current site must still work on the new
 * build, either as a page or as a redirect to one (migration/url-plan.json).
 * Astro writes static redirects as HTML files at the old path, so both ends of
 * each plan entry must exist in dist/.
 *
 * Usage: node scripts/parity.ts [--strict]   (after `astro build`; --strict fails on gaps)
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

type Entry = { from: string; action: 'keep' | 'redirect'; to: string };

const root = path.join(import.meta.dirname, '..');
const plan: Entry[] = JSON.parse(readFileSync(path.join(root, 'migration/url-plan.json'), 'utf8'));
const built = (target: string) => {
  const route = target.split('#')[0]!;
  return existsSync(path.join(root, 'dist', route === '/' ? 'index.html' : `${decodeURIComponent(route).slice(1)}.html`));
};

const missing = plan.filter((e) => !built(e.from) || !built(e.to));
const bySection = Map.groupBy(missing, (e) => e.from.split('/')[1] || '/');

console.log(`${plan.length - missing.length}/${plan.length} current URLs resolve on the new build.`);
for (const [section, entries] of [...bySection].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  missing ${String(entries.length).padStart(3)}  /${section === '/' ? '' : section}`);
}
if (process.argv.includes('--strict') && missing.length) process.exit(1);
