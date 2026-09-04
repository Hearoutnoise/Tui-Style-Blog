/*
 * app.js
 * --------------------------------------------------------------------------
 * Host-side loader for the TUI blog site.
 *
 * Responsibilities
 *  - Import and register the <tui-home>, <tui-file-manager> and
 *    <tui-doc-viewer> components.
 *  - Load the file system built from site.config.json (via build.js).
 *  - Coordinate the transitions between home, the file manager and the
 *    doc viewer. Every switch uses the shared ASCII scan effect.
 *
 * The components are decoupled from each other; this file is the only glue.
 */

import './tui-file-manager.js';
import './tui-doc-viewer.js';
import './tui-home.js';
import './tui-bg.js';
import { fileSystem, siteMeta } from './site.content.js';
import { homeAscii, homeSmile } from './site.home.js';

/* ---- Element refs ------------------------------------------------------- */
const fm = document.querySelector('tui-file-manager');
const viewer = document.querySelector('tui-doc-viewer');
const home = document.querySelector('tui-home');
const stage = document.querySelector('.stage');

/* ---- Bootstrap ----------------------------------------------------------- */
document.title = siteMeta.title || 'TUI-FS';
fm.setFileSystem(fileSystem);

fm.scanDuration = 260;    // 扫描时长，毫秒
fm.scanFade = 120;        // ASCII 停留时长，毫秒
fm.scanDirection = 'ltr'; // 方向，可选 ltr rtl ttb btt
viewer.scanDuration = fm.scanDuration;
viewer.scanFade = fm.scanFade;
viewer.scanDirection = fm.scanDirection;
home.scanDuration = fm.scanDuration;
home.scanFade = fm.scanFade;
home.scanDirection = fm.scanDirection;
home.setAscii(homeAscii.art, homeAscii.cols, homeAscii.rows);
home.setSmile(homeSmile.art, homeSmile.cols, homeSmile.rows);

/* ---- View state ----------------------------------------------------------- */
const navHome = document.querySelector('[data-nav="home"]');
const navFiles = document.querySelector('[data-nav="files"]');
let pendingDest = 'fm';

const isDocOpen = () => !viewer.hidden;

/** Show exactly one of home / file-manager. */
function syncView(target) {
  home.hidden = target !== 'home';
  stage.hidden = target !== 'fm';
  if (navHome) navHome.classList.toggle('is-active', target === 'home');
  if (navHome) navHome.classList.toggle('nav__link--muted', target !== 'home');
  if (navFiles) navFiles.classList.toggle('is-active', target === 'fm');
}

/** Play the scan over the currently visible view, then reveal the target. */
function scanSwitch(target) {
  const cur = home.hidden ? 'fm' : 'home';
  if (cur === target) return;
  const show = () => syncView(target);
  if (cur === 'home') home.playScan(show);
  else fm.playScan(show);
}

/** Route a header nav click to its destination. */
function navTo(dest) {
  if (isDocOpen()) { pendingDest = dest; viewer.close(); }
  else scanSwitch(dest);
}

// The landing view is Home.
syncView('home');

/* ---- File open -> scan -> doc viewer ------------------------------------- */
fm.addEventListener('open', (e) => {
  const node = e.detail.node;
  if (node.href) { window.open(node.href, '_blank', 'noopener'); return; }
  fm.playScan(() => {
    home.hidden = true;
    stage.hidden = true;
    viewer.open(node);
  });
});

viewer.addEventListener('close', () => {
  const dest = pendingDest;
  pendingDest = 'fm';
  syncView(dest);
  if (dest === 'fm') fm.focus();
});

/* ---- Home -> file manager -------------------------------------------------- */
home.addEventListener('open-fm', () => scanSwitch('fm'));

/* ---- Site header navigation ------------------------------------------------ */
if (navFiles) navFiles.addEventListener('click', (e) => { e.preventDefault(); navTo('fm'); });
if (navHome) navHome.addEventListener('click', (e) => { e.preventDefault(); navTo('home'); });
