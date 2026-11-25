import type { ImageMetadata } from 'astro';

/**
 * Inline style that names a photo for cross-page view transitions. The name comes from the
 * file, so a home card and the page it opens (which show the same photo) share it, and the
 * photo moves from one to the other. A page must not show the same named photo twice.
 */
export function photoTransition(image: ImageMetadata): string {
  const file = image.src.split('?')[0]!.split('/').at(-1)!.split('.')[0]!;
  return `view-transition-name: photo-${file.replace(/[^\w-]/g, '-')}; view-transition-class: photo`;
}
