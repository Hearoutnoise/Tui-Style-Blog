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
  background: var(--dt-bg);
  overflow: hidden;
}
:host([hidden]) { display: none; }
* { box-sizing: border-box; }

/* --- Four dashed lines, extending from the stage edges --- */
.frame { position: absolute; inset: 0; pointer-events: none; }
.line { position: absolute; display: block; }
.line--l { left: calc((100% - var(--box-w)) / 2); top: 0; bottom: 0; border-left: 1px dashed var(--dt-comment); }
.line--r { right: calc((100% - var(--box-w)) / 2); top: 0; bottom: 0; border-left: 1px dashed var(--dt-comment); }
.line--t { top: calc((100% - var(--box-h)) / 2); left: 0; right: 0; border-top: 1px dashed var(--dt-comment); }
.line--b { bottom: calc((100% - var(--box-h)) / 2); left: 0; right: 0; border-top: 1px dashed var(--dt-comment); }

/* --- Central rectangle --- */
.box {
  position: absolute;
  left: calc((100% - var(--box-w)) / 2);
  top: calc((100% - var(--box-h)) / 2);
  width: var(--box-w);
  height: var(--box-h);
}

.brand {
  position: absolute;
  left: 3.5%;
  top: 2.5%;
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
  color: var(--dt-cyan);
  white-space: nowrap;
}
.quote {
  position: absolute;
  left: 4%;
  top: 39%;
  width: 46%;
  margin: 0;
  padding-left: 14px;
  border-left: 2px solid var(--dt-purple);
  font-size: clamp(1rem, 1.6vw, 1.35rem);
  line-height: 1.8;
  color: var(--dt-comment);
  white-space: pre-line;
}
.cta {
  position: absolute;
  right: calc(100% - var(--gold) - 2%);
  bottom: 5%;
  display: flex;
  align-items: center;
  gap: 14px;
}
.cta__label { font-size: .78rem; letter-spacing: .18em; color: var(--dt-comment); }
.arrow {
  width: 3.2ch;
  height: 2.1em;
  border: 2px solid var(--dt-pink);
  color: var(--dt-pink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.9rem;
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
.btn--fm { border-color: var(--dt-purple); color: var(--dt-purple); }
.btn--fm:hover { background: rgba(189, 147, 249, .16); color: var(--dt-purple); }
`;

const TEMPLATE = /* html */ `
<div class="home">
  <div class="frame" aria-hidden="true">
    <i class="line line--l"></i><i class="line line--r"></i>
    <i class="line line--t"></i><i class="line line--b"></i>
  </div>
  <div class="box">
    <pre class="brand">███╗   ███╗██╗   ██╗    ██████╗ ██╗      ██████╗  ██████╗
████╗ ████║╚██╗ ██╔╝    ██╔══██╗██║     ██╔═══██╗██╔════╝
██╔████╔██║ ╚████╔╝     ██████╔╝██║     ██║   ██║██║  ███╗
██║╚██╔╝██║  ╚██╔╝      ██╔══██╗██║     ██║   ██║██║   ██║
██║ ╚═╝ ██║   ██║       ██████╔╝███████╗╚██████╔╝╚██████╔╝
╚═╝     ╚═╝   ╚═╝       ╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝</pre>
    <span class="smile">:)</span>
    <div class="ascii" aria-label="ascii art 占位"></div>
    <div class="vertical">HELLO WORLD</div>
    <blockquote class="quote">"Simplicity is the ultimate sophistication."\n— Leonardo da Vinci\n\n"Stay hungry, stay foolish."\n— Steve Jobs</blockquote>
    <div class="cta">
      <button class="btn btn--bio" type="button" title="个人简介（待设计）">个人简介</button>
      <button class="btn btn--fm" type="button" data-open-fm>打开文件管理</button>
      <span class="cta__label">点击左侧</span>
      <div class="arrow">←</div>
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

    this.scanEnabled = true;
    this.scanDirection = 'ltr';
    this.scanDuration = 260;
    this.scanFade = 120;

    this._openFmBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('open-fm', { bubbles: true, composed: true }));
    });
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
