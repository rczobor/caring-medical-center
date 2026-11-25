# Content notes

Notes for developers about the content files. Editors change these files through
the CMS, which rewrites a whole file on every save, so comments in a file it edits
would be lost. Notes about those files live here instead. `services.yaml`,
`clinics.yaml` and `booking-services.yaml` aren't edited through the CMS and keep
their comments in place.

Copy is verbatim from the live site as of 2026-11-07 unless marked "new" below.
Lines the clinic still has to confirm carry a FLAGGED code (A1, H12, …), here and in
comments across the code. The clinic reviews those questions outside this repository.

## prices.yaml

- Seeded from the live price page (`/rontgen-es-mr-arak`). The CT, rehabilitation
  and specialist rows come from `/ct-arak` and `/rehabilitacio-es-szakrendeles-arak`.
- Every page that shows a price reads it from this file.
- Names are verbatim, typos included (FLAGGED G1–G4).
- `extra: true` marks add-ons, such as `rtg-tovabbi-felvetel`, which never count
  as a "from" price.
- Exam pages refer to rows by `id`. Renaming an `id` fails the build until the
  exam pages that list it are updated.

## doctors.yaml

From the live specialty pages. A page lists the
doctors it shows in its `doctors` frontmatter.

## home.yaml

The homepage, from the live homepage.

| Field | Note |
| --- | --- |
| `heading` | The live headline is set one word per line: "Gyors / Pontos / Vizsgálatok / Emberközeli / Gondoskodással". |
| `helpTitle`, `helpIntro`, `complaints`, `shortcuts` | New (FLAGGED H2). `complaints` lead to the pages in `site/panaszok/`. |
| `lead` | FLAGGED A5 (superlative). |
| `stats` | The live page animates these counters up from 0. FLAGGED A3 (the figures), C2 ("vendégek"). |
| `specialties` | The live page links the duplicate "-2" pages; these are the canonical ones. FLAGGED A8, C4. |
| `rehabLabel` | FLAGGED C3 ("Alternatív Terápiák"). |
| `testimonials` | Full wording from the phone layout; the desktop layout cuts some short. FLAGGED F3 (no names or source). |

## pages/

| File | Note |
| --- | --- |
| `orvosaink.md` | New (FLAGGED H4). The directory itself comes from `doctors.yaml`, grouped by the specialty pages that list each doctor. |
| `hirek.md` | Source: `/hirek`. The live index lists 12 of the 34 articles; this one lists all of them, newest first. |
| `ct-arak.md` | Source: `/ct-arak`. The live title and description repeat the X-ray/MRI page's, so these are rebuilt from the page's own heading. |
| `kapcsolat.md` | Source: `/kapcsolat`, verbatim. The booking options, clinic details and deposit terms come from data; the body holds the rest. |
| `rehabilitacio-es-szakrendeles-arak.md` | Source: `/rehabilitacio-es-szakrendeles-arak`, verbatim. The live page also repeats the MRI region note; it's left out here (FLAGGED G6). |
| `rontgen-es-mr-arak.md` | Source: `/rontgen-es-mr-arak` and `/arak`, verbatim. `mrNote` is shown with the MR price list, since it changes how those prices add up. |

## site/panaszok/ and site/paciensinformaciok.md

New pages (FLAGGED H1, H3), written from the live site's own sentences where possible.
A complaint page's `pathway` steps link to existing pages; a link to an exam page, or to
a page that shows a price list, gets its "from" price from `prices.yaml`.

## site/arak.md

Source: `/arak`. `fromPrices` (new, FLAGGED H7) puts each price list's cheapest exam,
computed from `prices.yaml`, in a row before the copy.

## notes/foglalasi-dij.md

Source: `/kapcsolat`, verbatim. Exam and price pages show `summary`; the contact
page shows `lead`, `summary` and the full terms in the body. `lead` is FLAGGED C5:
it reads like arrival instructions above payment terms.

## English pages

The English site lives under `/en` with English URLs. Every English file is a translation of a
Hungarian one (FLAGGED I1); pages without one have no English version, and English pages link
their Hungarian page instead.

- **Shared data** (`prices.yaml`, `doctors.yaml`, `booking-services.yaml`, `clinics.yaml`,
  `services.yaml`) keeps one entry per item, with the English text in an `en` object on it. Prices,
  times and links exist once. A missing `en` value shows the Hungarian one.
- **Page copy** has its own file under an `en/` folder: `pages/en/kapcsolat.md`,
  `notes/en/foglalasi-dij.md`, `en/home.yaml`, under the Hungarian file's name.
- **Content and exam pages** sit under `site/en/` and `exams/en/` in the Hungarian folder, with
  an English file name that becomes the URL: `site/en/szakrendelesek/cardiology.md` is
  `/en/specialist-clinics/cardiology` (folder names in `siteSections`, `src/lib/locale.ts`), and
  `exams/en/mr/knee-mri.md` is `/en/mri/knee-mri`. `translationKey` names the Hungarian file.
- Images are named `@assets/site/…` (an alias in `tsconfig.json`), which works from any folder,
  so a page and its English copy share the same image path.
- English copy links English pages. `tests/i18n.spec.ts` fails when an English page links a
  Hungarian page that has an English version.
- The words the templates set themselves (buttons, labels, messages) are in `src/lib/ui.ts`.

The CMS edits both languages: a page and its English file are one entry, with a language
switch. Fields marked `i18n: duplicate` in `public/admin/config.yml` (image, doctors, booking
panel, date…) are edited in Hungarian and copied into the English file on save, and
`tests/cms-config.spec.ts` checks they already match. Hungarian-only fields such as `source`
stay out of the English files. A new page or article starts in Hungarian; English is switched on
from the editor's menu. The CMS previews an English page at its Hungarian path under `/en`
(`/en/szakrendelesek/cardiology`), which redirects to its English URL (`astro.config.mjs`).

## Formatting

The files are formatted the way the CMS writes them: two-space indents, no line
wrapping, and quotes only where YAML needs them. Hand edits in the same style keep
the CMS's next save from reformatting the file.
