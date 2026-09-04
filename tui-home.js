/*!
 * TUI Home
 * --------------------------------------------------------------------------
 * A decoupled Web Component that renders the site home page in the TUI /
 * Dracula style. The home page is framed by four dashed lines that extend
 * from the four edges of the file-manager stage, and its content is laid out
 * around the golden section of the central rectangle.
 *
 * It is self-contained (own palette, own style, own Shadow DOM) and knows
 * nothing about the file manager. The host page coordinates the transition
 * (the "open file manager" button emits an `open-fm` event).
 *
 * The shared page background (solid Dracula colour + the four dashed guide
 * lines that frame the stage box) is rendered by the decoupled `<tui-bg>`
 * component, which sits behind the home content. Keeping the background out
 * of this view means the ASCII scan transition dissolves only the content and
 * reveals the background (including the dashed lines) instead of painting an
 * opaque colour over it.
 */

import { scanElement } from './scan-effect.js';

const PALETTE = {
  bg: '#282a36',
  current: '#44475a',
  selection: '#44475a',
  fg: '#f8f8f2',
  comment: '#6272a4',
  red: '#ff5555',
  orange: '#ffb86c',
  yellow: '#f1fa8c',
  green: '#50fa7b',
  cyan: '#8be9fd',
  purple: '#bd93f9',
  pink: '#ff79c6',
};

const CSS = /* css */ `
:host {
  --dt-bg: ${PALETTE.bg};
  --dt-current: ${PALETTE.current};
  --dt-fg: ${PALETTE.fg};
  --dt-comment: ${PALETTE.comment};
  --dt-green: ${PALETTE.green};
  --dt-cyan: ${PALETTE.cyan};
  --dt-purple: ${PALETTE.purple};
  --dt-pink: ${PALETTE.pink};
  --tui-font: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code',
    'Cascadia Mono', 'Source Code Pro', Menlo, Consolas, 'Liberation Mono',
    monospace;
  --tui-line: ${PALETTE.current};
  --gold: 61.8%;
  --box-w: min(1080px, calc(100% - 48px));
  --box-h: min(640px, calc(100vh - 150px));

  display: block;
  position: absolute;
  inset: 0;
  z-index: 10;
  font-family: var(--tui-font);
  color: var(--dt-fg);
  /* The solid background and the four dashed guide lines now come from the
   * shared <tui-bg> background component that sits behind this view. */
  background: transparent;
  overflow: hidden;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }

/* --- Central rectangle --- */
.box {
  position: absolute;
  left: calc((100% - var(--box-w)) / 2);
  top: calc((100% - var(--box-h)) / 2);
  width: var(--box-w);
  height: var(--box-h);
}

/* --- Left content column (brand + aphorisms flow naturally) --- */
.content {
  position: absolute;
  left: 3.5%;
  top: 2.5%;
  width: 46%;
}
.brand {
  margin: 0;
  font-family: 'Courier New', Courier, monospace;
  font-size: clamp(9px, 1.32vw, 17px);
  font-weight: 400;
  line-height: 1.1;
  letter-spacing: 0;
  color: var(--dt-purple);
  white-space: pre;
  user-select: none;
}
.smile {
  position: absolute;
  left: var(--gold);
  top: 2.5%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.2ch;
  height: 2.1em;
  border: 2px solid var(--dt-pink);
  color: var(--dt-pink);
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1;
}
.ascii {
  position: absolute;
  left: calc(var(--gold) + 3.5%);
  right: 3%;
  top: 2.5%;
  height: 55%;
  border: 1px solid var(--dt-current);
  background: rgba(68, 71, 90, .12);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.ascii__art {
  margin: 0;
  white-space: pre;
  line-height: 1;
  color: var(--dt-pink);
  font-family: var(--tui-font);
  font-size: 16px;
}
.vertical {
  position: absolute;
  left: var(--gold);
  top: 15%;
  bottom: 26%;
  transform: translateX(-50%);
  writing-mode: vertical-rl;
  font-size: clamp(0.95rem, 2vw, 1.7rem);
  font-weight: 700;
  letter-spacing: .3em;
  color: var(--dt-pink);
  white-space: nowrap;
}
.quote {
  margin: 0;
  font-size: clamp(0.9rem, 1.35vw, 1.12rem);
  line-height: 1.75;
  color: var(--dt-comment);
  white-space: pre-line;
}
.cta {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 5%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.btn {
  border: 1px solid var(--dt-current);
  background: transparent;
  color: var(--dt-fg);
  font-family: var(--tui-font);
  font-size: .92rem;
  padding: 8px 16px;
  border-radius: 0;
  cursor: pointer;
}
.btn:hover { background: var(--dt-current); color: var(--dt-pink); }
`;

const TEMPLATE = /* html */ `
<div class="home">
  <div class="box">
    <div class="content">
    <pre class="brand">███╗   ███╗██╗   ██╗    ██████╗ ██╗      ██████╗  ██████╗
████╗ ████║╚██╗ ██╔╝    ██╔══██╗██║     ██╔═══██╗██╔════╝
██╔████╔██║ ╚████╔╝     ██████╔╝██║     ██║   ██║██║  ███╗
██║╚██╔╝██║  ╚██╔╝      ██╔══██╗██║     ██║   ██║██║   ██║
██║ ╚═╝ ██║   ██║       ██████╔╝███████╗╚██████╔╝╚██████╔╝
╚═╝     ╚═╝   ╚═╝       ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝</pre>
    <blockquote class="quote">"Simplicity is the ultimate sophistication."\n— Leonardo da Vinci\n\n"Stay hungry, stay foolish."\n— Steve Jobs\n\n"Talk is cheap. Show me the code."\n— Linus Torvalds</blockquote>
    </div>
    <span class="smile">:)</span>
    <div class="ascii" aria-label="ascii art 占位"><pre class="ascii__art"></pre></div>
    <div class="vertical">HELLO WORLD</div>
    <div class="cta">
      <button class="btn btn--bio" type="button" title="个人简介（待设计）">个人简介</button>
      <button class="btn btn--fm" type="button" data-open-fm>打开文件管理</button>
    </div>
  </div>
</div>
`;

class TuiHome extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const styles = document.createElement('style');
    styles.textContent = CSS;
    const root = document.createElement('div');
    root.innerHTML = TEMPLATE;
    this.shadowRoot.append(styles, root);

    this._boxEl = root.querySelector('.box');
    this._openFmBtn = root.querySelector('[data-open-fm]');
    this._bioBtn = root.querySelector('.btn--bio');
    this._asciiBox = root.querySelector('.ascii');
    this._asciiPre = root.querySelector('.ascii__art');
    this._asciiArt = null;

    this.scanEnabled = true;
    this.scanDirection = 'ltr';
    this.scanDuration = 260;
    this.scanFade = 120;

    this._openFmBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-fm', { bubbles: true, composed: true }));
    });

    if (this._asciiBox && 'ResizeObserver' in globalThis) {
      this._asciiRO = new ResizeObserver(() => this._fitAscii());
      this._asciiRO.observe(this._asciiBox);
    }
  }

  /** Render ASCII artwork into the right-hand reserved box. */
  setAscii(art, cols, rows) {
    this._asciiArt = { art: art || '', cols, rows };
    this._renderAscii();
  }

  _renderAscii() {
    if (!this._asciiPre) return;
    this._asciiPre.textContent = (this._asciiArt && this._asciiArt.art) || '';
    this._fitAscii();
  }

  /** Scale the artwork so it fits (contain) inside the box without clipping. */
  _fitAscii() {
    const pre = this._asciiPre;
    const box = this._asciiBox;
    if (!pre || !box || !this._asciiArt || !this._asciiArt.art) return;

    // Measure the artwork at a reference font size using an off-screen probe.
    const probe = document.createElement('pre');
    probe.style.position = 'absolute';
    probe.style.left = '-99999px';
    probe.style.top = '0';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'pre';
    probe.style.lineHeight = '1';
    probe.style.fontFamily = getComputedStyle(pre).fontFamily;
    probe.style.fontSize = '16px';
    probe.textContent = pre.textContent;
    document.body.appendChild(probe);
    const natW = probe.offsetWidth;
    const natH = probe.offsetHeight;
    probe.remove();

    if (natW <= 0 || natH <= 0) return;
    const scale = Math.min(box.clientWidth / natW, box.clientHeight / natH);
    pre.style.fontSize = (16 * scale) + 'px';
  }

  get hidden() { return this.hasAttribute('hidden'); }
  set hidden(v) {
    if (v) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  /** Play the ASCII scan over the central content, then run the callback. */
  playScan(callback) {
    const done = typeof callback === 'function' ? callback : () => {};
    if (!this.scanEnabled) { done(); return; }
    scanElement(this._boxEl, {
      direction: this.scanDirection,
      duration: this.scanDuration,
      fade: this.scanFade,
    }, done).catch(() => done());
  }
}

if (!customElements.get('tui-home')) {
  customElements.define('tui-home', TuiHome);
}
