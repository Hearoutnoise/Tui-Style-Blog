/*
 * tools/image-to-ascii.js
 * --------------------------------------------------------------------------
 * Converts a raster image into ASCII art (a grid of characters whose density
 * represents luminance). Pure JavaScript using jimp, so `build.js` can call
 * it with the Node standard library plus the jimp dependency.
 *
 * The output is a string of characters plus the grid dimensions. The rendered
 * characters are all one colour (the host styles them with the Dracula pink),
 * so only the character density carries the image information.
 */

'use strict';

const Jimp = require('jimp');

// Luminance ramp, index 0 is the sparsest glyph (a space), index n-1 is the
// densest glyph. On a dark background the dense glyphs read as the bright
// parts of the image.
const CHARS = ' .:-=+*#%@';

/**
 * Convert an image to ASCII art.
 *
 * @param {string} imagePath Path to the source image (jpg / png / etc).
 * @param {object} [opts]
 * @param {number} [opts.cols]     Target character columns (grid width).
 * @param {number} [opts.charAspect] Rendered mono-character width/height ratio.
 * @returns {Promise<{art:string, cols:number, rows:number, charAspect:number}>}
 */
async function imageToAscii(imagePath, opts = {}) {
  const cols = Math.max(2, Math.round(opts.cols || 60));
  const charAspect = opts.charAspect != null ? opts.charAspect : 0.6;

  const image = await Jimp.read(imagePath);
  const w = image.bitmap.width;
  const h = image.bitmap.height;

  // Preserve the on-screen aspect of the source image after it is rendered
  // as character cells:
  //   renderedWidth  / renderedHeight  =  imgW / imgH
  //   (cols*charW)   / (rows*charH)    =  w / h
  //   rows = cols * (h / w) * (charW / charH) = cols * (h/w) * charAspect
  const rows = Math.max(1, Math.round(cols * (h / w) * charAspect));

  // Resample the image to exactly cols x rows so each character samples one
  // source cell. resample (bicubic) smooths the luminance nicely for ASCII.
  const grid = image.clone().resize(cols, rows);
  const { data } = grid.bitmap;

  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Perceived luminance, 0..255.
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const t = lum / 255; // 0 (dark) .. 1 (bright)
      // Bright pixels -> dense glyphs, so the shape reads on a dark surface.
      const idx = Math.round(t * (CHARS.length - 1));
      line += CHARS[idx];
    }
    lines.push(line);
  }

  return { art: lines.join('\n'), cols, rows, charAspect };
}

module.exports = { imageToAscii, CHARS };
