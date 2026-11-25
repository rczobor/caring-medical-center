import type { SatteriProcessorOptions } from '@astrojs/markdown-satteri';

type HastPlugin = NonNullable<SatteriProcessorOptions['hastPlugins']>[number];

/*
 * Widths for a Markdown picture, by the list it sits in. The kinds and their sizes follow
 * the `.copy` rules in src/styles/global.css, which tell them apart the same way:
 *   card   "- ![](photo)" then "## [Title](/page)": two a row below 1024 px, three above
 *   logo   "- [![](logo) Name](https://…)": at most 80 px tall, so about 200 px wide
 *   other  a photo in the text column, at most 36rem wide
 * Astro turns `widths` and `sizes` into a srcset, so a phone no longer loads the 1600 px
 * original for a 170 px card.
 */
const kinds = {
  card: { widths: [240, 360, 480, 720, 960], sizes: '(min-width: 1024px) 360px, (min-width: 640px) calc(50vw - 28px), calc(50vw - 24px)' },
  logo: { widths: [200, 400], sizes: '(min-width: 448px) 200px, calc(50vw - 24px)' },
  other: { widths: [360, 576, 720, 1152], sizes: '(min-width: 640px) 576px, calc(100vw - 2rem)' },
};

const isElement = (node: unknown, ...tags: string[]): boolean =>
  typeof node === 'object' && node !== null && 'tagName' in node && tags.includes(String(node.tagName));

export const markdownImageSizes = {
  name: 'markdown-image-sizes',
  element: {
    filter: ['img'],
    visit(img, ctx) {
      const parent = ctx.parent(img);
      const kind =
        isElement(parent, 'li') && parent.children.some((child) => isElement(child, 'h2', 'h3'))
          ? kinds.card
          : isElement(parent, 'a') && isElement(ctx.parent(parent), 'li')
            ? kinds.logo
            : kinds.other;
      ctx.setProperty(img, 'widths', kind.widths);
      ctx.setProperty(img, 'sizes', kind.sizes);
    },
  },
} satisfies HastPlugin;
