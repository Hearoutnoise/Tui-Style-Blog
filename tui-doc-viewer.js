/*!
 * TUI Doc Viewer
 * --------------------------------------------------------------------------
 * A decoupled, framework-agnostic Web Component that renders a single
 * article / document in a TUI (terminal) style view.
 *
 * It is fully self-contained: its own Dracula palette, its own style, its
 * own Shadow DOM. It knows nothing about the file manager; the host page
 * coordinates the transition between the two.
 *
 * Usage
 *  <script type="module" src="tui-doc-viewer.js"></script>
 *  <tui-doc-viewer></tui-doc-viewer>
 *
 *  const viewer = document.querySelector('tui-doc-viewer');
 *  viewer.open({ title, tags, date, modified, name, content });
 *  viewer.addEventListener('close', () => { ... });
 *
 * No build step, no dependencies.
 */

import { scanElement } from './scan-effect.js';

/* --------------------------------------------------------------------------
 * Dracula palette tokens. All values come from DRACULA.md.
 * ------------------------------------------------------------------------ */
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
  --dt-selection: ${PALETTE.selection};
  --dt-fg: ${PALETTE.fg};
  --dt-comment: ${PALETTE.comment};
  --dt-red: ${PALETTE.red};
  --dt-orange: ${PALETTE.orange};
  --dt-yellow: ${PALETTE.yellow};
  --dt-green: ${PALETTE.green};
  --dt-cyan: ${PALETTE.cyan};
  --dt-purple: ${PALETTE.purple};
  --dt-pink: ${PALETTE.pink};
  --tui-font: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code',
    'Cascadia Mono', 'Source Code Pro', Menlo, Consolas, 'Liberation Mono',
    'PingFang SC', 'Microsoft YaHei', 'DengXian',
    'Noto Sans CJK SC', 'Source Han Sans SC', 'WenQuanYi Micro Hei',
    'SimSun', monospace, sans-serif;
  --tui-line: ${PALETTE.current};
  --tui-radius: 0px;

  display: block;
  font-family: var(--tui-font);
  color: var(--dt-fg);
  /* host is transparent so the shared <tui-bg> (solid colour + dashed frame)
   * shows through during the ASCII scan dissolve. In the stable state the
   * opaque .doc fills the host, so the background is hidden anyway. */
  background: transparent;
  outline: none;
}
:host([hidden]) { display: none; }

* { box-sizing: border-box; }

.doc {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--dt-bg);
  border: 1px solid var(--tui-line);
  border-top: 2px solid var(--dt-purple);
  border-bottom: 0;
  border-radius: var(--tui-radius);
  overflow: hidden;
  color: var(--dt-fg);
}
.doc.is-enter { animation: doc-fade-in 200ms ease-out; }
.doc.is-leave { animation: doc-fade-out 160ms ease-in; }
@keyframes doc-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes doc-fade-out { from { opacity: 1; } to { opacity: 0; } }

/* ---- Header ------------------------------------------------------------- */
.doc__head {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 16px;
  border-bottom: 1px dashed var(--dt-comment);
  border-radius: var(--tui-radius);
}
.doc__head-left { min-width: 0; flex: 1; }
.doc__title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--dt-purple);
  overflow-wrap: anywhere;
}
.doc__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 18px;
  margin-top: 10px;
  font-size: 12px;
  letter-spacing: .02em;
}
.doc__meta .tag { color: var(--dt-purple); }
.doc__meta .date { color: var(--dt-comment); }
.doc__meta .mod { color: var(--dt-comment); }
.doc__meta .name { color: var(--dt-cyan); }

/* Dashed-outlined close (X) box */
.doc__close {
  flex: none;
  align-self: flex-start;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px dashed var(--dt-comment);
  border-radius: var(--tui-radius);
  background: transparent;
  color: var(--dt-fg);
  font-family: var(--tui-font);
  font-size: 18px;
  line-height: 1;
  text-align: center;
  cursor: pointer;
}
.doc__close:hover { background: var(--dt-current); color: var(--dt-pink); }

/* ---- Body --------------------------------------------------------------- */
.doc__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--dt-fg);
  outline: none;
  overflow-wrap: break-word;
  word-break: break-word;
}
.doc__body h1,
.doc__body h2,
.doc__body h3 {
  color: var(--dt-cyan);
  font-family: var(--tui-font);
  line-height: 1.3;
}
.doc__body h1 { font-size: 20px; border-bottom: 1px solid var(--tui-line); padding-bottom: 8px; margin: 0 0 18px; }
.doc__body h2 { font-size: 16px; margin: 24px 0 10px; }
.doc__body h3 { font-size: 14px; margin: 20px 0 8px; color: var(--dt-pink); }
.doc__body p { margin: 12px 0; }
.doc__body a { color: var(--dt-cyan); }
.doc__body a:hover { color: var(--dt-pink); }
.doc__body code { background: var(--dt-current); padding: 0 5px; border-radius: var(--tui-radius); }
.doc__body pre { background: var(--dt-current); padding: 12px 14px; overflow-x: auto; border-radius: var(--tui-radius); }
.doc__body pre code { background: none; padding: 0; }
.doc__body ul, .doc__body ol { margin: 12px 0; padding-left: 26px; }
.doc__body li { margin: 4px 0; }
.doc__body blockquote { margin: 14px 0; padding: 2px 16px; border-left: 3px solid var(--dt-purple); color: var(--dt-comment); }
.doc__body hr { border: none; border-top: 1px dashed var(--dt-comment); margin: 24px 0; }
.doc__body strong { color: var(--dt-yellow); }

/* ---- Scrollbar ------------------------------------------------------------ */
.doc__body::-webkit-scrollbar { width: 10px; height: 10px; }
.doc__body::-webkit-scrollbar-track { background: var(--dt-bg); }
.doc__body::-webkit-scrollbar-thumb { background: var(--tui-line); border: 2px solid var(--dt-bg); border-radius: 0; }
.doc__body::-webkit-scrollbar-thumb:hover { background: var(--dt-comment); }
`;

const TEMPLATE = /* html */ `
<div class="doc" data-doc>
  <header class="doc__head">
    <div class="doc__head-left">
      <h1 class="doc__title" data-title></h1>
      <div class="doc__meta" data-meta></div>
    </div>
    <button class="doc__close" data-close title="返回文件系统" type="button">×</button>
  </header>
  <div class="doc__body" data-body tabindex="0"></div>
</div>
`;

/* ---- Markdown helpers (trusted config content) --------------------------- */
function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function inline(src) {
  let s = src;
  s = s.replace(/`([^`]+)`/g, (_, c) => '<code>' + c + '</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
function renderMarkdown(src) {
  const blocks = String(src).replace(/\r\n/g, '\n').split(/\n{2,}/);
  let html = '';
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    const first = lines[0].trim();
    if (/^###\s+/.test(first)) { html += '<h3>' + inline(esc(first.replace(/^###\s+/, ''))) + '</h3>'; continue; }
    if (/^##\s+/.test(first)) { html += '<h2>' + inline(esc(first.replace(/^##\s+/, ''))) + '</h2>'; continue; }
    if (/^#\s+/.test(first)) { html += '<h1>' + inline(esc(first.replace(/^#\s+/, ''))) + '</h1>'; continue; }
    if (/^[-*]\s+/.test(first)) {
      const items = lines
        .filter((l) => /^[-*]\s+/.test(l))
        .map((l) => '<li>' + inline(esc(l.replace(/^[-*]\s+/, ''))) + '</li>')
        .join('');
      html += '<ul>' + items + '</ul>';
      continue;
    }
    html += '<p>' + lines.map((l) => inline(esc(l))).join('<br>') + '</p>';
  }
  return html;
}

class TuiDocViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const styles = document.createElement('style');
    styles.textContent = CSS;
    const root = document.createElement('div');
    root.innerHTML = TEMPLATE;
    this.shadowRoot.append(styles, root);

    this._docEl = root.querySelector('[data-doc]');
    this._titleEl = root.querySelector('[data-title]');
    this._metaEl = root.querySelector('[data-meta]');
    this._bodyEl = root.querySelector('[data-body]');
    this._closeEl = root.querySelector('[data-close]');

    this.scanEnabled = true;
    this.scanDirection = 'ltr';
    this.scanDuration = 520;
    this.scanFade = 160;

    this._closeEl.addEventListener('click', () => this.close());
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.hidden) this.close();
    });
    this._bodyEl.addEventListener('click', () => this._bodyEl.focus());
  }

  get hidden() {
    return this.hasAttribute('hidden');
  }
  set hidden(v) {
    if (v) this.setAttribute('hidden', '');
    else this.removeAttribute('hidden');
  }

  /**
   * Populate and display a document.
   * @param {object} node file node with title/tags/date/modified/name/content
   */
  open(node) {
    this._titleEl.textContent = node.title || node.name || '';
    this._renderMeta(node);
    this._bodyEl.innerHTML = renderMarkdown(node.content || '*empty*');
    this.hidden = false;
    const doc = this._docEl;
    doc.classList.remove('is-enter');
    void doc.offsetWidth;
    doc.classList.add('is-enter');
    this._closeEl.focus();
    this._bodyEl.scrollTop = 0;
  }

  /**
   * Hide the document and notify the host it should return to the file system.
   * When the scan is enabled, the document is dissolved with the same ASCII
   * scan used elsewhere, then hidden.
   */
  async close() {
    if (this.hidden) return;
    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hide = () => { this.hidden = true; };
    if (this.scanEnabled && !reduced) {
      try {
        await scanElement(this._docEl, {
          direction: this.scanDirection,
          duration: this.scanDuration,
          fade: this.scanFade,
        }, hide);
      } catch (e) {
        hide();
      }
    } else {
      hide();
    }
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  _renderMeta(node) {
    const meta = [];
    if (Array.isArray(node.tags) && node.tags.length) {
      meta.push('<span class="tag">#' + node.tags.map(esc).join(' #') + '</span>');
    }
    if (node.date) meta.push('<span class="date">' + esc(node.date) + '</span>');
    if (node.modified) meta.push('<span class="mod">modified ' + esc(node.modified) + '</span>');
    if (node.name) meta.push('<span class="name">' + esc(node.name) + '</span>');
    this._metaEl.innerHTML = meta.join('');
  }
}

if (!customElements.get('tui-doc-viewer')) {
  customElements.define('tui-doc-viewer', TuiDocViewer);
}
