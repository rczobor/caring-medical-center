# Content notes

Notes for developers about the content files. Editors change these files through
the CMS, which rewrites a whole file on every save, so comments in a file it edits
would be lost. Notes about those files live here instead. `services.yaml`,
`clinics.yaml` and `booking-services.yaml` aren't edited through the CMS and keep
their comments in place.

## prices.yaml

- Every page that shows a price reads it from this file.
- `extra: true` marks add-ons, such as `rtg-tovabbi-felvetel`, which never count
  as a "from" price.
- Exam pages refer to rows by `id`. Renaming an `id` fails the build until the
  exam pages that list it are updated.

## doctors.yaml

A specialty page lists the doctors it shows in its `doctors` frontmatter.

## home.yaml

The homepage.

| Field | Note |
| --- | --- |
| `complaints` | Lead to the pages in `site/panaszok/`. |
| `specialties` | Links to the specialty pages. |
| `testimonials` | Shown as quotes; phones show the first few and a button for the rest. |

## pages/

| File | Note |
| --- | --- |
| `orvosaink.md` | The directory itself comes from `doctors.yaml`, grouped by the specialty pages that list each doctor. |
| `hirek.md` | The news index lists every article, newest first. |
| `kapcsolat.md` | The booking options, clinic details and deposit terms come from data; the body holds the rest. |
| `rontgen-es-mr-arak.md` | `mrNote` is shown with the MR price list, since it changes how those prices add up. |

## site/panaszok/

A complaint page's `pathway` steps link to existing pages; a link to an exam page, or to
a page that shows a price list, gets its "from" price from `prices.yaml`.

## site/arak.md

`fromPrices` puts each price list's cheapest exam, computed from `prices.yaml`, in a
row before the copy.

## notes/foglalasi-dij.md

Exam and price pages show `summary`; the contact page shows `lead`, `summary` and the
full terms in the body.

## English pages

The English site lives under `/en` with English URLs. Every English file is a translation of a
Hungarian one; pages without one have no English version, and English pages link
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
`tests/cms-config.spec.ts` checks they already match. A new page or article starts in Hungarian; English is switched on
from the editor's menu. The CMS previews an English page at its Hungarian path under `/en`
(`/en/szakrendelesek/cardiology`), which redirects to its English URL (`astro.config.mjs`).

## Formatting

The files are formatted the way the CMS writes them: two-space indents, no line
wrapping, and quotes only where YAML needs them. Hand edits in the same style keep
the CMS's next save from reformatting the file.
