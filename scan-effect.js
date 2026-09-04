/*!
 * Scan Effect
 * --------------------------------------------------------------------------
 * A reusable ASCII dissolve transition. It captures any element, converts it
 * to ASCII art, and plays a directional sweep that dissolves the element A.
 * The caller supplies an `onReveal` callback that runs at the moment the
 * sweep is about to finish, so the caller can swap in the next view.
 *
 * It depends only on html2canvas-pro (loaded locally, with a CDN fallback)
 * and is completely decoupled from any specific component.
 */

let scannerPromise = null;
function loadScanner() {
  if (scannerPromise) return scannerPromise;
  scannerPromise = (async () => {
    const sources = [
      () => import('./vendor/html2canvas-pro.esm.js'),
      () => import('https://cdn.jsdelivr.net/npm/html2canvas-pro@1.5.8/dist/html2canvas-pro.esm.js'),
    ];
    for (const load of sources) {
      try {
        const mod = await load();
        const fn = mod && (mod.default || mod.html2canvas);
        if (typeof fn === 'function') return fn;
      } catch (e) { /* try the next source */ }
    }
    return null;
  })();
  return scannerPromise;
}

const pct = (v) => (v * 100).toFixed(2) + '%';

/** Clip-path values for the photo (original) layer and the ASCII layer. */
function clipFor(direction, lead, tail) {
  const L = Math.max(0, Math.min(1, lead));
  const T = Math.max(0, Math.min(1, tail == null ? 0 : tail));
  const e = Math.min(L, T);
  let photoClip;
  let asciiClip;
  if (direction === 'ltr') {
    photoClip = `inset(0 0 0 ${pct(L)})`;
    asciiClip = `inset(0 ${pct(1 - L)} 0 ${pct(e)})`;
  } else if (direction === 'rtl') {
    photoClip = `inset(0 ${pct(L)} 0 0)`;
    asciiClip = `inset(0 ${pct(e)} 0 ${pct(1 - L)})`;
  } else if (direction === 'ttb') {
    photoClip = `inset(${pct(L)} 0 0 0)`;
    asciiClip = `inset(${pct(e)} 0 ${pct(1 - L)} 0)`;
  } else {
    photoClip = `inset(0 0 ${pct(L)} 0)`;
    asciiClip = `inset(${pct(1 - L)} 0 ${pct(e)} 0)`;
  }
  return { photoClip, asciiClip };
}

/** Turn a captured image into an ASCII canvas of the given CSS size. */
function renderAscii(src, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#44475A';
  ctx.textBaseline = 'middle';

  const fontSize = Math.max(8, Math.round(H / 44));
  ctx.font = `${fontSize}px monospace`;
  const cw = Math.max(4, Math.round(ctx.measureText('M').width));
  const cols = Math.max(1, Math.floor(W / cw));
  const rows = Math.max(1, Math.floor(H / fontSize));

  const sw = src.width;
  const sh = src.height;
  const sctx = src.getContext('2d');
  const data = sctx.getImageData(0, 0, sw, sh).data;
  const ramp = '.:-=+*#%@';

  for (let r = 0; r < rows; r += 1) {
    const sy0 = Math.floor((r * sh) / rows);
    const sy1 = Math.max(sy0 + 1, Math.floor(((r + 1) * sh) / rows));
    for (let c = 0; c < cols; c += 1) {
      const sx0 = Math.floor((c * sw) / cols);
      const sx1 = Math.max(sx0 + 1, Math.floor(((c + 1) * sw) / cols));
      let maxLum = 0;
      for (let y = sy0; y < sy1; y += 1) {
        for (let x = sx0; x < sx1; x += 1) {
          const i = (y * sw + x) * 4;
          if (data[i + 3] < 10) continue;
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          if (lum > maxLum) maxLum = lum;
        }
      }
      const t = Math.pow(maxLum / 255, 2.0);
      const idx = Math.min(ramp.length - 1, Math.round(t * (ramp.length - 1)));
      const ch = ramp[idx];
      if (ch !== ' ') ctx.fillText(ch, c * cw, r * fontSize + fontSize / 2);
    }
  }
  return canvas;
}

/**
 * Play the scan dissolve over `target`.
 *
 * @param {Element} target element to dissolve
 * @param {object} [opts]  { direction, duration, fade }
 * @param {function} [onReveal] called when the sweep is about to finish so the
 *                              caller can swap in the next view.
 * @returns {Promise<void>} resolves once the overlay is removed.
 */
export async function scanElement(target, opts = {}, onReveal) {
  const direction = opts.direction || 'ltr';
  const duration = opts.duration || 520;
  const fade = opts.fade != null ? opts.fade : 160;

  const html2canvas = await loadScanner();
  const rect = target.getBoundingClientRect();
  const W = Math.max(1, Math.round(rect.width));
  const H = Math.max(1, Math.round(rect.height));
  if (!html2canvas || !W || !H) { if (onReveal) onReveal(); return; }

  try {
    const src = await html2canvas(target, {
      backgroundColor: null,
      logging: false,
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });

    const photo = document.createElement('canvas');
    photo.width = W;
    photo.height = H;
    photo.getContext('2d').drawImage(src, 0, 0, W, H);
    const ascii = renderAscii(src, W, H);

    const computedBg = getComputedStyle(target).backgroundColor;
    const bg = (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent')
      ? computedBg : '#282a36';

    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      `left:${rect.left}px`,
      `top:${rect.top}px`,
      `width:${W}px`,
      `height:${H}px`,
      'z-index:999',
      'overflow:hidden',
      'pointer-events:none',
      `background:${bg}`,
    ].join(';');
    photo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    ascii.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    overlay.append(photo, ascii);
    document.body.appendChild(overlay);

    const total = duration + fade;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        const elapsed = now - t0;
        const lead = Math.min(1, elapsed / duration);
        const tail = Math.max(0, Math.min(1, (elapsed - fade) / duration));
        const clip = clipFor(direction, lead, tail);
        photo.style.clipPath = clip.photoClip;
        ascii.style.clipPath = clip.asciiClip;
        if (elapsed < total) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });

    if (onReveal) onReveal();
    overlay.remove();
  } catch (err) {
    if (onReveal) onReveal();
  }
}
