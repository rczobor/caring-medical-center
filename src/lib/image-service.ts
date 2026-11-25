import type { LocalImageService } from 'astro';
import sharpService from 'astro/assets/services/sharp';
import sharp from 'sharp';

const focalPoint = /^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/;

/**
 * Astro's sharp service, plus crops at a focal point. With `fit: 'cover'`, a width, a height
 * and `position: '50% 47%'` (CSS object-position syntax), it cuts exactly what a browser shows
 * for `object-fit: cover; object-position: 50% 47%` in a box of that shape. Sharp's own
 * `position` only takes gravities ('centre', 'north'), which would shift the framing.
 */
const service: LocalImageService = {
  ...sharpService,
  async transform(input, options, config, logger) {
    const focus = typeof options.position === 'string' ? focalPoint.exec(options.position) : null;
    if (!focus || options.fit !== 'cover' || !options.width || !options.height) {
      return sharpService.transform(input, options, config, logger);
    }
    const image = sharp(input, { autoOrient: true, failOn: 'none' });
    const { width, height } = (await image.metadata()).autoOrient;
    const aspect = options.width / options.height;
    const cropWidth = Math.min(width, Math.round(height * aspect));
    const cropHeight = Math.min(height, Math.round(width / aspect));
    const region = {
      left: Math.round(((width - cropWidth) * Number(focus[1])) / 100),
      top: Math.round(((height - cropHeight) * Number(focus[2])) / 100),
      width: cropWidth,
      height: cropHeight,
    };
    // Lossless in between, so the photo is compressed once, by Astro's own encoder.
    const cropped = await image.extract(region).png({ compressionLevel: 0 }).toBuffer();
    return sharpService.transform(cropped, { ...options, position: undefined }, config, logger);
  },
};

export default service;
