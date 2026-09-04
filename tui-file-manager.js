/*!
 * TUI File Manager
 * --------------------------------------------------------------------------
 * A decoupled, framework-agnostic Web Component that renders a terminal
 * user interface (TUI) style file manager.
 *
 * Features
 *  - Directory tree with box-drawing connectors (right-angle line art).
 *  - Two-pane file listing (name / size / modified).
 *  - Keyboard and mouse navigation.
 *  - Dracula color scheme (all colors from DRACULA.md).
 *  - Sharp, right-angle panel borders (border-radius is always zero).
 *
 * Usage
 *  <script type="module" src="tui-file-manager.js"></script>
 *  <tui-file-manager></tui-file-manager>
 *
 *  const fm = document.querySelector('tui-file-manager');
 *  fm.setFileSystem(myFileSystem);
 *
 * No build step, no dependencies. The component self-contains its styles in
 * a Shadow DOM, so it can be dropped into any HTML, Vue, React, etc. host.
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

/* --------------------------------------------------------------------------
 * Shared styles. Reused by every component instance.
 * ------------------------------------------------------------------------ */
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

  /* Monospace stack to reproduce the terminal grid. */
  --tui-font: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Fira Code',
    'Cascadia Mono', 'Source Code Pro', Menlo, Consolas, 'Liberation Mono',
    monospace;

  /* Line color and radius. Right angles only. */
  --tui-line: ${PALETTE.current};
  --tui-radius: 0px;

  display: block;
  width: 100%;
  height: 100%;
  min-width: 640px;
  min-height: 420px;
  font-family: var(--tui-font);
  color: var(--dt-fg);
  /* host is transparent so the shared <tui-bg> (solid colour + dashed frame)
   * shows through during the ASCII scan dissolve. In the stable state the
   * opaque .app fills the host, so the background is hidden anyway. */
  background: transparent;
  outline: none;
}

* { box-sizing: border-box; }

.app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--dt-bg);
  border: 1px solid var(--tui-line);
  border-radius: var(--tui-radius);
  overflow: hidden;
  color: var(--dt-fg);
}

.stage { position: relative; width: 100%; height: 100%; }

.app.is-enter { animation: tui-fade-in 240ms ease-out; }
@keyframes tui-fade-in { from { opacity: 0; } to { opacity: 1; } }

/* ---- Title bar ---------------------------------------------------------- */
.titlebar {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
  border-bottom: 1px solid var(--tui-line);
  border-top: 2px solid var(--dt-purple);
  flex: none;
}
.titlebar__dot { color: var(--dt-green); font-size: 11px; line-height: 1; }
.titlebar__brand { color: var(--dt-purple); letter-spacing: .12em; font-weight: 700; }
.titlebar__sep { color: var(--dt-comment); }
.titlebar__path { color: var(--dt-cyan); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.titlebar__crumb { color: var(--dt-cyan); cursor: pointer; }
.titlebar__crumb:hover { text-decoration: underline; color: var(--dt-pink); }
.titlebar__right { margin-left: auto; color: var(--dt-comment); font-size: 11px; white-space: nowrap; }
/* ---- Workspace (tree + list) ------------------------------------------- */
.work { display: flex; flex: 1; min-height: 0; }
.pane { display: flex; flex-direction: column; min-height: 0; }
.pane--tree { width: 252px; flex: none; }
.rail { width: 1px; background: var(--tui-line); flex: none; }
.pane--list { flex: 1; }

.pane__head {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  font-size: 11px;
  letter-spacing: .16em;
  color: var(--dt-comment);
  border-bottom: 1px solid var(--tui-line);
  flex: none;
}
.pane__head .frame { color: var(--dt-purple); white-space: pre; }
.pane__head .title { color: var(--dt-comment); }
.pane__head .hline { flex: 1; height: 1px; background: var(--tui-line); }

.pane__scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; }

/* ---- Tree ---------------------------------------------------------------- */
.tree { padding: 6px 0; }
.tree__node {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 6px;
  font-size: 13px;
  cursor: pointer;
  white-space: pre;
  border-left: 2px solid transparent;
}
.tree__node:hover { background: rgba(68, 71, 90, .45); }
.tree__node.is-active { background: var(--dt-selection); border-left-color: var(--dt-purple); color: var(--dt-fg); }
.tree__node .conn { color: var(--dt-comment); }
.tree__node .node-glyph { width: 1.4em; }

/* ---- Listing columns ------------------------------------------------------ */
.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 132px;
  gap: 8px;
  padding: 5px 10px;
  font-size: 10px;
  letter-spacing: .14em;
  color: var(--dt-comment);
  border-bottom: 1px solid var(--tui-line);
  flex: none;
  white-space: nowrap;
}
.cols__size { text-align: right; }

.rows { padding-bottom: 8px; }
.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 132px;
  gap: 8px;
  align-items: center;
  height: 27px;
  padding: 0 10px;
  font-size: 13px;
  cursor: pointer;
  border-left: 2px solid transparent;
  white-space: nowrap;
}
.row:hover { background: rgba(68, 71, 90, .45); }
.row.is-active { background: var(--dt-selection); border-left-color: var(--dt-purple); color: var(--dt-fg); }
.row.is-active .tag { color: var(--dt-fg); }
.row__name { display: flex; align-items: center; gap: 8px; overflow: hidden; }
.row__name .tag {
  flex: none;
  width: 3ch;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .05em;
}
.row__name .nm { overflow: hidden; text-overflow: ellipsis; }
.row__size { text-align: right; color: var(--dt-comment); }
.row__time { color: var(--dt-comment); }

/* ---- Status bar ----------------------------------------------------------- */
.statusbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 28px;
  padding: 0 14px;
  font-size: 11px;
  color: var(--dt-comment);
  border-top: 1px solid var(--tui-line);
  flex: none;
}
.statusbar::before { content: '└──'; color: var(--dt-purple); white-space: pre; }
.statusbar__left { color: var(--dt-comment); overflow: hidden; white-space: nowrap; }
.statusbar__hint { margin-left: auto; color: var(--dt-comment); white-space: nowrap; }

/* ---- Scrollbar -------------------------------------------------------------- */
.pane__scroll::-webkit-scrollbar { width: 10px; height: 10px; }
.pane__scroll::-webkit-scrollbar-track { background: var(--dt-bg); }
.pane__scroll::-webkit-scrollbar-thumb { background: var(--tui-line); border: 2px solid var(--dt-bg); border-radius: 0; }
.pane__scroll::-webkit-scrollbar-thumb:hover { background: var(--dt-comment); }

:host:focus-visible .app { box-shadow: 0 0 0 1px var(--dt-purple); }
`;

const TEMPLATE = /* html */ `
<div class="stage">
  <div class="app">
  <header class="titlebar">
    <span class="titlebar__dot">●</span>
    <span class="titlebar__brand">TUI-FS</span>
    <span class="titlebar__sep">/</span>
    <span class="titlebar__path" data-path></span>
    <span class="titlebar__right" data-count></span>
  </header>

  <section class="work">
    <aside class="pane pane--tree">
      <div class="pane__head">
        <span class="frame">┌─</span>
        <span class="title">DIRECTORIES</span>
        <span class="hline"></span>
      </div>
      <div class="pane__scroll tree" data-tree></div>
    </aside>

    <div class="rail"></div>

    <main class="pane pane--list">
      <div class="pane__head">
        <span class="frame">┌─</span>
        <span class="title">FILES</span>
        <span class="hline"></span>
      </div>
      <div class="cols">
        <div class="cols__name">NAME</div>
        <div class="cols__size">SIZE</div>
        <div class="cols__time">MODIFIED</div>
      </div>
      <div class="pane__scroll rows" data-list></div>
    </main>
  </section>

  <footer class="statusbar">
    <span class="statusbar__left" data-status></span>
    <span class="statusbar__hint">↑↓ move · ⏎ open · ⌫/← up · → down</span>
  </footer>
  </div>
</div>
`;
/* --------------------------------------------------------------------------
 * Helpers.
 * ------------------------------------------------------------------------ */

/** Escape text for safe insertion into HTML strings. */
function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Human readable byte size. */
function humanSize(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const units = ['B', 'K', 'M', 'G', 'T'];
  let value = n;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return (i ? value.toFixed(1) : value) + units[i];
}

/** Directory child count as the size placeholder for folders. */
function dirSize(node) {
  if (!node.children) return '·';
  return `${node.children.length}p`;
}

/** Short time display. Accepts a formatted string, epoch number or Date. */
function timeStr(node) {
  if (node.modified == null) return '—';
  if (typeof node.modified === 'number' || node.modified instanceof Date) {
    const d = new Date(node.modified);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug',
      'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (x) => String(x).padStart(2, '0');
    return `${months[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(node.modified);
}

/**
 * Classify a node into a display category. The category drives both the
 * accent color and the file-type tag shown next to the name.
 */
function kindOf(node) {
  if (node.type === 'dir') return 'dir';
  const m = node.name.match(/\.([^.]+)$/);
  const ext = m ? m[1].toLowerCase() : '';
  const code = ['js', 'ts', 'jsx', 'tsx', 'py', 'rs', 'go', 'rb', 'php', 'c',
    'h', 'cpp', 'css', 'scss', 'html', 'md', 'sh', 'bash', 'yml', 'yaml'];
  const image = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif'];
  const media = ['mp4', 'mkv', 'webm', 'mp3', 'wav', 'flac', 'ogg'];
  const archive = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'];
  const exe = ['exe', 'msi', 'dmg', 'bin', 'app'];
  const config = ['env', 'ini', 'cfg', 'conf', 'toml', 'json'];
  const text = ['txt', 'log', 'csv', 'rtf'];
  const doc = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
  if (code.includes(ext)) return 'code';
  if (image.includes(ext)) return 'image';
  if (media.includes(ext)) return 'media';
  if (archive.includes(ext)) return 'archive';
  if (exe.includes(ext)) return 'exe';
  if (config.includes(ext)) return 'config';
  if (text.includes(ext)) return 'text';
  if (doc.includes(ext)) return 'doc';
  return 'other';
}

const KIND_COLOR = {
  dir: 'var(--dt-cyan)',
  code: 'var(--dt-green)',
  image: 'var(--dt-pink)',
  media: 'var(--dt-orange)',
  archive: 'var(--dt-yellow)',
  exe: 'var(--dt-red)',
  config: 'var(--dt-purple)',
  text: 'var(--dt-fg)',
  doc: 'var(--dt-cyan)',
  other: 'var(--dt-fg)',
};

/** 3-character file type tag for the listing. */
function tagFor(node) {
  if (node.type === 'dir') return 'DIR';
  const m = node.name.match(/\.([^.]+)$/);
  if (m) return m[1].toUpperCase().slice(0, 3);
  return '·';
}

/* --------------------------------------------------------------------------
 * File system wrapper. Reads a tree where a directory node is
 *   { name, type: 'dir', children: [ ... ] }
 * and a file node is
 *   { name, type: 'file', size?, modified? }.
 * A path is an array of segment names. The empty array is the root.
 * ------------------------------------------------------------------------ */
class FileSystem {
  constructor(root) {
    this.root = root;
  }

  /** Resolve a node at a path, or null. */
  node(path) {
    let node = this.root;
    for (const seg of path) {
      if (!node || !node.children) return null;
      node = node.children.find((c) => c.name === seg);
      if (!node) return null;
    }
    return node;
  }

  /** Path array to a canonical display string. Root renders as '~'. */
  pathStr(path) {
    return path.length ? '~/' + path.join('/') : '~';
  }

  /** Parse a canonical string back to a path array. */
  parse(str) {
    if (str === '~') return [];
    return str.slice(2).split('/');
  }

  /** Sorted children: folders first, then files, alphabetical. */
  list(path) {
    const node = this.node(path);
    if (!node || !node.children) return [];
    return node.children.slice().sort((a, b) => {
      const da = a.type === 'dir' ? 0 : 1;
      const db = b.type === 'dir' ? 0 : 1;
      if (da !== db) return da - db;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }
}
/* --------------------------------------------------------------------------
 * The Web Component.
 * ------------------------------------------------------------------------ */
class TuiFileManager extends HTMLElement {
  static observedAttributes = ['label', 'scan-direction', 'no-scan'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._keyHandler = this._onKeyDown.bind(this);

    this.state = {
      cwd: [],                     // current directory (path array)
      expanded: new Set(['~']),    // expanded directory path strings
      selected: 0,                 // selected index within the listing
      history: [],
      historyIndex: -1,
    };

    this.scanEnabled = true;
    this.scanDirection = 'ltr';
    this.scanDuration = 520;
    this.scanFade = 160;
    this._scanning = false;
    this.dblclickMs = 320;
    this._lastClick = { t: 0, idx: -1 };
    this._treeLastClick = { t: 0, path: '' };
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'scan-direction') this.scanDirection = newValue || 'ltr';
    if (name === 'no-scan') this.scanEnabled = !(newValue != null);
  }

  connectedCallback() {
    if (!this._attached) {
      this.shadowRoot.innerHTML = TEMPLATE;
      this._applyStyles();
      this._bind();
      this._attached = true;
    }
    if (!this.fs) this.setFileSystem(defaultFileSystem());
    this.setAttribute('tabindex', '0');
    this.render();
  }

  _applyStyles() {
    const style = document.createElement('style');
    style.textContent = CSS;
    this.shadowRoot.prepend(style);
  }

  _bind() {
    const root = this.shadowRoot;
    this._treeEl = root.querySelector('[data-tree]');
    this._listEl = root.querySelector('[data-list]');
    this._pathEl = root.querySelector('[data-path]');
    this._countEl = root.querySelector('[data-count]');
    this._statusEl = root.querySelector('[data-status]');
    this._appEl = root.querySelector('.app');

    this.addEventListener('keydown', this._keyHandler);

    // Click delegation on the listing. Two clicks on the same row within
    // the window act like Enter (open). We track it ourselves instead of
    // relying on the browser's per-target double-click detection.
    this._listEl.addEventListener('click', (e) => {
      const seg = e.target.closest('[data-idx]');
      if (!seg) return;
      const idx = Number(seg.dataset.idx);
      const now = performance.now();
      const isDouble = (now - this._lastClick.t) < this.dblclickMs &&
        this._lastClick.idx === idx;
      this._lastClick = { t: now, idx };
      if (isDouble) {
        this._lastClick = { t: 0, idx: -1 };
        this._openFromList(idx);
      } else {
        this._select(idx);
      }
    });

    // Click delegation on the tree.
    this._treeEl.addEventListener('click', (e) => {
      const seg = e.target.closest('[data-path]');
      if (!seg) return;
      const pathStr = seg.dataset.path;
      const now = performance.now();
      const isDouble = (now - this._treeLastClick.t) < this.dblclickMs &&
        this._treeLastClick.path === pathStr;
      this._treeLastClick = { t: now, path: pathStr };
      if (isDouble) {
        this._treeLastClick = { t: 0, path: '' };
        this._openTree(pathStr);
      } else {
        this._toggleTree(pathStr);
      }
    });

    // Breadcrumbs in the title bar.
    this._pathEl.addEventListener('click', (e) => {
      const seg = e.target.closest('[data-seg]');
      if (!seg) return;
      const depth = Number(seg.dataset.seg);
      this._navigate(this.state.cwd.slice(0, depth + 1));
    });

    this._appEl.addEventListener('click', () => this.focus());
  }

  /* ---- Public API -------------------------------------------------------- */

  /** Replace the file system and re-render. */
  setFileSystem(fs) {
    const root = fs && (fs.root || fs);
    this.fs = new FileSystem(root);
    this.state.cwd = [];
    this.state.expanded = new Set(['~']);
    this.state.selected = 0;
    this.state.history = [];
    this.state.historyIndex = -1;
    if (this.isConnected) {
      this.render();
      this.focus();
    }
  }

  /** Expand a directory so it is visible in the tree. */
  setExpanded(path) {
    this.state.expanded.add(this.fs.pathStr(path));
    if (this.isConnected) this.render();
  }

  /** Navigate to a path array (list of segment names). */
  cd(path) {
    const node = this.fs.node(path);
    if (!node || node.type !== 'dir') return;
    this._navigate(path.slice());
  }

  refresh() {
    this.render();
  }

  /**
   * Play the ASCII scan transition without navigating. Useful for a host to
   * transition out of the file manager (for example into the doc viewer).
   * The callback runs once the scan has finished (or immediately when the
   * scan is disabled).
   */
  playScan(callback) {
    const done = typeof callback === 'function' ? callback : () => {};
    if (!this.scanEnabled) { done(); return; }
    this._playScan(done);
  }

  get currentPath() {
    return this.fs.pathStr(this.state.cwd);
  }
  /* ---- State transitions -------------------------------------------------- */

  _pushHistory() {
    const { history, historyIndex } = this.state;
    history.length = historyIndex + 1;
    history.push(this.state.cwd.slice());
    this.state.historyIndex += 1;
  }

  _select(idx, scroll = true) {
    const items = this.fs.list(this.state.cwd);
    if (!items.length) { this.state.selected = 0; return; }
    const next = Math.max(0, Math.min(idx, items.length - 1));
    this.state.selected = next;
    this._setActive(next);
    if (scroll) {
      const cell = this._listEl.querySelector(`[data-idx="${next}"]`);
      if (cell) cell.scrollIntoView({ block: 'nearest' });
    }
    this._renderStatus();
  }

  _setActive(idx) {
    const cells = this._listEl.querySelectorAll('.row');
    cells.forEach((c) => c.classList.toggle('is-active', Number(c.dataset.idx) === idx));
  }

  _openFromList(idx) {
    const items = this.fs.list(this.state.cwd);
    const node = items[idx];
    if (!node) return;
    if (node.type === 'dir') {
      this._enter(this.state.cwd.concat(node.name));
    } else {
      this._emit('open', { path: this.state.cwd.concat(node.name), node });
    }
  }

  _enter(path) {
    this._navigate(path.slice());
  }

  _goUp() {
    if (!this.state.cwd.length) return;
    this._navigate(this.state.cwd.slice(0, -1));
  }

  _toggleTree(pathStr) {
    const path = this.fs.parse(pathStr);
    const node = this.fs.node(path);
    if (!node || node.type !== 'dir') return;
    if (this.state.expanded.has(pathStr)) this.state.expanded.delete(pathStr);
    else this.state.expanded.add(pathStr);
    this.render();
  }

  _openTree(pathStr) {
    const path = this.fs.parse(pathStr);
    const node = this.fs.node(path);
    if (!node || node.type !== 'dir') return;
    this._navigate(path);
  }

  _onKeyDown(e) {
    const items = this.fs.list(this.state.cwd);
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this._select(this.state.selected + 1); break;
      case 'ArrowUp': e.preventDefault(); this._select(this.state.selected - 1); break;
      case 'Home': e.preventDefault(); this._select(0); break;
      case 'End': e.preventDefault(); this._select(items.length - 1); break;
      case 'Enter':
      case 'ArrowRight': e.preventDefault(); this._openFromList(this.state.selected); break;
      case 'Backspace':
      case 'ArrowLeft': e.preventDefault(); this._goUp(); break;
      default: break;
    }
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  /* ---- Scan transition ---------------------------------------------------- */

  _navigate(path) {
    if (this._scanning) return;
    const apply = () => {
      this.state.cwd = path.slice();
      this.state.expanded.add(this.fs.pathStr(path));
      this.state.selected = 0;
      this._pushHistory();
      this.render();
      this._fadeIn();
    };
    if (this.scanEnabled) this._playScan(apply);
    else apply();
  }

  _playScan(callback) {
    if (this._scanning) { callback(); return; }
    const reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const done = () => { this._scanning = false; callback(); };
    if (reduced) { done(); return; }

    this._scanning = true;
    scanElement(this._appEl, {
      direction: this.scanDirection,
      duration: this.scanDuration,
      fade: this.scanFade,
    }, done).catch(() => done());
  }

  _fadeIn() {
    const app = this._appEl;
    app.classList.remove('is-enter');
    void app.offsetWidth;
    app.classList.add('is-enter');
  }

  /* ---- Rendering --------------------------------------------------------- */

  render() {
    if (!this._attached) return;
    this._renderTitle();
    this._renderTree();
    this._renderList();
    this._renderStatus();
  }

  _renderTitle() {
    const cwd = this.state.cwd;
    const crumbs = cwd.map((seg, i) =>
      `<span class="titlebar__crumb" data-seg="${i}">${esc(seg)}</span>`);
    this._pathEl.innerHTML =
      '<span class="titlebar__crumb" data-seg="-1">~</span>' +
      (cwd.length ? '<span class="titlebar__sep">/</span>' + crumbs.join('<span class="titlebar__sep">/</span>') : '');

    const items = this.fs.list(this.state.cwd);
    const dirs = items.filter((n) => n.type === 'dir').length;
    this._countEl.textContent = `${items.length} item · ${dirs} dir`;
  }

  /**
   * Build the tree rows using box-drawing connectors. Each row carries the
   * ancestor bands it needs so vertical line art is drawn correctly.
   */
  _renderTree() {
    const rows = [];
    const walk = (path, node, bands, selfIsLast) => {
      const connector = path.length ? this._connector(bands, selfIsLast) : '';
      rows.push({ node, path, connector });
      if (node.type === 'dir' && this.state.expanded.has(this.fs.pathStr(path))) {
        const children = this.fs.list(path).filter((c) => c.type === 'dir');
        const childBands = path.length ? bands.concat([{ isLast: selfIsLast }]) : [];
        children.forEach((child, i) => {
          walk(path.concat(child.name), child, childBands, i === children.length - 1);
        });
      }
    };

    walk([], this.fs.root, [], true);

    const current = this.fs.pathStr(this.state.cwd);
    const frag = document.createDocumentFragment();
    for (const row of rows) {
      const node = document.createElement('div');
      const isActive = this.fs.pathStr(row.path) === current;
      node.className = 'tree__node' + (isActive ? ' is-active' : '');
      node.dataset.path = this.fs.pathStr(row.path);

      const conn = document.createElement('span');
      conn.className = 'conn';
      conn.textContent = row.connector;

      const label = document.createElement('span');
      label.style.color = row.node.type === 'dir' ? 'var(--dt-cyan)' : 'var(--dt-fg)';
      label.textContent = row.node.type === 'dir' ? row.node.name + '/' : row.node.name;

      const isDir = row.node.type === 'dir';
      // Only folders that actually contain subfolders get the caret.
      const hasSub = isDir && (row.node.children || []).some((c) => c.type === 'dir');
      if (hasSub) {
        const glyph = document.createElement('span');
        glyph.className = 'node-glyph';
        glyph.textContent = this.state.expanded.has(this.fs.pathStr(row.path)) ? '▾' : '▸';
        node.append(conn, glyph, label);
      } else {
        node.append(conn, label);
      }
      frag.appendChild(node);
    }
    this._treeEl.replaceChildren(frag);
  }

  _connector(bands, selfIsLast) {
    let out = '';
    for (const b of bands) out += b.isLast ? '    ' : '│   ';
    out += selfIsLast ? '└─ ' : '├─ ';
    return out;
  }
  _renderList() {
    if (!this._listEl) return;
    const items = this.fs.list(this.state.cwd);
    if (!items.length) {
      this._listEl.innerHTML =
        '<div style="padding:18px 12px;color:#6272a4;font-size:13px;">-- empty --</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((node, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (i === this.state.selected ? ' is-active' : '');
      row.dataset.idx = i;

      const nameCell = document.createElement('span');
      nameCell.className = 'row__name';

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.style.color = KIND_COLOR[kindOf(node)];
      tag.textContent = tagFor(node);

      const nm = document.createElement('span');
      nm.className = 'nm';
      nm.textContent = node.type === 'dir' ? node.name + '/' : node.name;

      nameCell.append(tag, nm);

      const size = document.createElement('span');
      size.className = 'row__size';
      size.textContent = node.type === 'dir' ? dirSize(node) : humanSize(node.size);

      const time = document.createElement('span');
      time.className = 'row__time';
      time.textContent = timeStr(node);

      row.append(nameCell, size, time);
      frag.appendChild(row);
    });
    this._listEl.replaceChildren(frag);
  }

  _renderStatus() {
    const items = this.fs.list(this.state.cwd);
    const sel = items[this.state.selected];
    if (sel) {
      const color = KIND_COLOR[kindOf(sel)];
      const size = sel.type === 'dir' ? dirSize(sel) : humanSize(sel.size);
      this._statusEl.innerHTML =
        `<span style="color:${color}">${esc(tagFor(sel))}</span> ${esc(sel.name)}` +
        (sel.type === 'dir' ? '/' : '') + ` · ${esc(size)} · ${esc(timeStr(sel))}`;
    } else {
      this._statusEl.textContent = 'no selection';
    }
  }
}

/* --------------------------------------------------------------------------
 * Example file system for the demo. Represents a small self-hosted blog
 * workspace. Replace with your own data via setFileSystem().
 * ------------------------------------------------------------------------ */
function defaultFileSystem() {
  const dir = (name, children, modified) => ({ name, type: 'dir', modified, children });
  const file = (name, size, modified) => ({ name, type: 'file', size, modified });

  return {
    name: '~',
    type: 'dir',
    children: [
      dir('Projects', [
        dir('self-blog', [
          file('index.html', 2440, 'Aug 31 13:40'),
          file('styles.css', 6312, 'Aug 31 13:41'),
          file('DRACULA.md', 1338, 'Aug 31 13:22'),
          file('tui-file-manager.js', 15240, 'Aug 31 13:44'),
          dir('src', [
            file('components.js', 9120, 'Aug 30 18:02'),
            file('router.js', 2044, 'Aug 30 18:05'),
            file('theme.js', 3310, 'Aug 29 09:11'),
          ], 'Aug 30 18:05'),
          dir('static', [
            file('dracula.css', 4110, 'Aug 28 22:00'),
            file('logo.svg', 812, 'Aug 28 22:04'),
            file('hero.png', 250880, 'Aug 28 22:12'),
          ], 'Aug 28 22:12'),
        ], 'Aug 31 13:44'),
        dir('notes', [
          file('roadmap.md', 2998, 'Aug 27 20:33'),
          file('publish.sh', 512, 'Aug 27 20:40'),
          file('draft.txt', 1204, 'Aug 26 15:19'),
        ], 'Aug 27 20:40'),
        dir('archives', [
          { name: 'backup-2026.zip', type: 'file', size: 10485760, modified: 'Aug 01 03:00' },
          { name: 'assets.tar.gz', type: 'file', size: 2034562, modified: 'Jul 30 11:12' },
        ], 'Aug 01 03:00'),
      ], 'Aug 31 13:44'),
      dir('Documents', [
        dir('design', [
          file('wireframe.fig', 48120, 'Aug 20 14:00'),
          file('palette.css', 2330, 'Aug 20 14:15'),
        ], 'Aug 20 14:15'),
        file('reading-list.md', 1820, 'Aug 19 08:45'),
        file('notes.log', 6660, 'Aug 18 22:10'),
      ], 'Aug 20 14:15'),
      dir('Downloads', [
        file('dracula-theme.zip', 1400880, 'Aug 12 10:22'),
        file('install.sh', 468, 'Aug 12 10:24'),
        file('readme.txt', 902, 'Aug 12 10:25'),
      ], 'Aug 12 10:25'),
      dir('Photos', [
        file('vacation.png', 4021245, 'Jul 01 17:30'),
        file('portrait.jpg', 1180044, 'Jul 01 17:32'),
        file('cover.webp', 340121, 'Jul 01 17:33'),
      ], 'Jul 01 17:33'),
      file('readme.md', 2040, 'Aug 25 09:00'),
      file('config.json', 1180, 'Aug 24 12:10'),
      file('data.csv', 98102, 'Aug 23 16:44'),
    ],
  };
}
/* Allow both a plain script tag and ES module import. */
if (typeof customElements !== 'undefined') {
  const already = customElements.get('tui-file-manager');
  if (!already) customElements.define('tui-file-manager', TuiFileManager);
}

globalThis.TuiFileManager = TuiFileManager;
globalThis.defaultFileSystem = defaultFileSystem;

export { TuiFileManager, defaultFileSystem };
export default TuiFileManager;
