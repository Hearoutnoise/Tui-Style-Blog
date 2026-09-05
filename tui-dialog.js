/*!
 * TUI Dialog
 * --------------------------------------------------------------------------
 * A generic, framework-agnostic Web Component that renders a modal in the
 * Dracula TUI style. There is no drag or resize. A close (×) button and the
 * Escape key both close it.
 *
 * On open it snaps the whole page with html2canvas-pro, converts that snapshot
 * to ASCII art, and reveals a full-viewport ASCII overlay with a radial ripple
 * that spreads outward from the dialog. The dialog panel itself stays normal
 * and sits on top. On close the panel and the ASCII overlay fade away together.
 *
 * The capture + ASCII + ripple logic lives inside this component (no separate
 * effect component). html2canvas-pro is loaded lazily, with a CDN fallback.
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

/**
 * Draw a luminance-to-character rendering of `src` into `ctx`, at W x H.
 * The character ramp and palette match the ASCII scan effect.
 */
/* Blend channel-wise between two [r,g,b] arrays; t in [0,1]. */
function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Draw a luminance-to-character rendering of `src` into `ctx`, at W x H.
 * The character ramp, background and default palette match the ASCII scan
 * effect. If `rect` (a bounding client rect in viewport coordinates) is given,
 * characters in a thin band around it are tinted red that fades back to the
 * default colour as they move away from the rectangle edge (a rectangular
 * gradient ring).
 */
function renderAscii(ctx, src, W, H, rect) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#282A36'; // --dt-bg
  ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'middle';

  const fontSize = Math.max(8, Math.round(H / 44));
  ctx.font = `${fontSize}px monospace`;
  const cw = Math.max(4, Math.round(ctx.measureText('M').width));
  const cols = Math.max(1, Math.floor(W / cw));
  const rows = Math.max(1, Math.floor(H / fontSize));

  const sw = src.width;
  const sh = src.height;
  const data = src.getContext('2d').getImageData(0, 0, sw, sh).data;
  const ramp = '.:-=+*#%@';

  const orig = [0x44, 0x47, 0x5A]; // #44475A
  const red = [0xff, 0x55, 0x55];   // #ff5555
  const hasBand = !!(rect && rect.width && rect.height);
  const band = hasBand ? Math.round(fontSize * 3) : 0;

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
      if (ch === ' ') continue;

      if (hasBand) {
        const cx = c * cw + cw / 2;
        const cy = r * fontSize + fontSize / 2;
        const dx = Math.max(rect.left - cx, 0, cx - rect.right);
        const dy = Math.max(rect.top - cy, 0, cy - rect.bottom);
        const d = Math.hypot(dx, dy);
        if (d < band) {
          const k = Math.min(1, d / band);
          const col = mix(red, orig, k);
          ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        } else {
          ctx.fillStyle = '#44475A';
        }
      } else {
        ctx.fillStyle = '#44475A';
      }

      ctx.fillText(ch, c * cw, r * fontSize + fontSize / 2);
    }
  }
}

const CSS = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: block;
    color: var(--dt-fg, #f8f8f2);
    font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code',
      'Cascadia Mono', Menlo, Consolas, monospace;
    transition: opacity .16s linear;
  }
  :host([hidden]) { display: none; }

  .ascii {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  .panel {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1;
    width: min(560px, calc(100% - 48px));
    max-height: calc(100vh - 120px);
    overflow: auto;
    background: var(--dt-bg, #282a36);
    border: 1px solid var(--dt-red, #ff5555);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--dt-current, #44475a);
  }
  .title { color: var(--dt-purple, #bd93f9); font-weight: 700; letter-spacing: .08em; }
  .close {
    appearance: none;
    background: none;
    border: 1px solid var(--dt-current, #44475a);
    color: var(--dt-comment, #6272a4);
    width: 26px;
    height: 26px;
    line-height: 1;
    font-size: 15px;
    cursor: pointer;
    padding: 0;
  }
  .close:hover { background: var(--dt-current, #44475a); color: var(--dt-pink, #ff79c6); }
  .body { padding: 18px 20px; line-height: 1.7; }
  .body p { margin: 0 0 12px; }
  .body p:last-child { margin-bottom: 0; }
  .body a { color: var(--dt-cyan, #8be9fd); }
`;

const TEMPLATE = `
  <canvas class="ascii" data-ascii></canvas>
  <section class="panel" role="dialog" aria-modal="true" data-panel>
    <header class="head">
      <span class="title" data-title></span>
      <button class="close" data-close type="button" title="关闭" aria-label="关闭">×</button>
    </header>
    <div class="body" data-body></div>
  </section>
`;

class TuiDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const styles = document.createElement('style');
    styles.textContent = CSS;
    const root = document.createElement('div');
    root.innerHTML = TEMPLATE;
    this.shadowRoot.append(styles, root);

    this._ascii = root.querySelector('[data-ascii]');
    this._panel = root.querySelector('[data-panel]');
    this._titleEl = root.querySelector('[data-title]');
    this._bodyEl = root.querySelector('[data-body]');
    this._closeEl = root.querySelector('[data-close]');

    this._open = false;
    this._raf = 0;
    this._src = null;
    this._resizeTimer = 0;
    this.duration = 1100;

    this._onResize = () => {
      if (!this._open || !this._src) return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        cancelAnimationFrame(this._raf);
        const W = Math.max(1, Math.round(window.innerWidth));
        const H = Math.max(1, Math.round(window.innerHeight));
        this._ascii.width = W;
        this._ascii.height = H;
        const panelRect = this._panel.getBoundingClientRect();
        renderAscii(this._ascii.getContext('2d'), this._src, W, H, panelRect);
        this._ascii.style.clipPath = 'none';
      }, 120);
    };
    window.addEventListener('resize', this._onResize);

    this._closeEl.addEventListener('click', () => this.close());
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._open) this.close();
    });
  }

  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(v) {
    if (v) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  get isOpen() { return this._open; }

  /** Open the dialog. `data` is `{ title, content }` with `content` as HTML. */
  async open(data = {}) {
    if (this._open) return;
    this._open = true;

    this._titleEl.textContent = data.title || '';
    this._bodyEl.innerHTML = data.content || '';
    this._panel.style.opacity = '1';

    this._ascii.getContext('2d').clearRect(0, 0, this._ascii.width || 1, this._ascii.height || 1);
    this._ascii.style.clipPath = 'circle(0px at 50% 50%)';
    this.style.opacity = '1';
    this.hidden = false;
    this._closeEl.focus();

    try {
      const html2canvas = await loadScanner();
      const W = Math.max(1, Math.round(window.innerWidth));
      const H = Math.max(1, Math.round(window.innerHeight));
      if (html2canvas) {
        const src = await html2canvas(document.body, {
          backgroundColor: null,
          logging: false,
          scale: Math.min(window.devicePixelRatio || 1, 2),
        });
        this._src = src;
        this._ascii.width = W;
        this._ascii.height = H;
        const panelRect = this._panel.getBoundingClientRect();
        renderAscii(this._ascii.getContext('2d'), src, W, H, panelRect);
        this._playRipple(W, H);
      }
    } catch (e) {
      console.warn('dialog ascii: ' + e.message);
    }
  }

  /** Close the dialog: the panel and ASCII overlay fade out together. */
  close() {
    cancelAnimationFrame(this._raf);
    this._open = false;
    this.style.opacity = '0';
    const hide = () => {
      this.hidden = true;
      this.style.opacity = '';
      this._src = null;
      this._ascii.getContext('2d').clearRect(0, 0, this._ascii.width || 1, this._ascii.height || 1);
      this._ascii.style.clipPath = '';
      this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
    };
    if (this.hidden) { hide(); return; }
    setTimeout(hide, 160);
  }

  /** Expand a radial clip so the ASCII art ripples outward from the dialog. */
  _playRipple(W, H) {
    const cx = W / 2;
    const cy = H / 2;
    const maxR = Math.hypot(cx, cy) + 20;
    const dur = Math.max(120, this.duration || 700);
    const t0 = performance.now();
    const step = (now) => {
      if (!this._open) return;
      const p = Math.min(1, (now - t0) / dur);
      // easeInOutCubic: slow start, steady middle, gentle finish.
      const ease = p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2;
      this._ascii.style.clipPath = `circle(${(ease * maxR).toFixed(1)}px at ${cx}px ${cy}px)`;
      if (p < 1) {
        this._raf = requestAnimationFrame(step);
      } else {
        // Once the ripple has fully spread, drop the circle so the ASCII
        // overlay covers the whole viewport even after a resize.
        this._ascii.style.clipPath = 'none';
      }
    };
    this._raf = requestAnimationFrame(step);
  }
}

if (!customElements.get('tui-dialog')) {
  customElements.define('tui-dialog', TuiDialog);
}
