/*!
 * TUI Background
 * --------------------------------------------------------------------------
 * A decoupled, reusable Web Component that paints the shared page background
 * in the TUI / Dracula style: a solid Dracula background plus four dashed
 * guide lines that frame the stage box. The four lines sit exactly on the
 * edges of the central box (where the file-manager panel / home box lives)
 * and extend beyond it to the page margins.
 *
 * It is self-contained (own palette, own style, own Shadow DOM) and knows
 * nothing about any view. Drop it behind any layout that wants a consistent
 * TUI stage frame. It never intercepts pointer events, so it is purely
 * decorative.
 *
 * The blog site uses it once, as the shared background behind every view
 * (home, file manager and doc viewer). The home content, the file-manager
 * panel and the reader all sit on top of it and align with the dashed box:
 * the file manager fills the center rectangle and the reader's left/right
 * edges line up with the two vertical dashed lines, while the lines extend
 * outward past the box.
 *
 * The dashed frame is also what the ASCII scan transition reveals when it
 * dissolves a view: because it lives *behind* the views, dissolving the view
 * content never hides the dashed lines (they are part of the background, not
 * part of the dissolved content).
 */

const PALETTE = {
  bg: '#282a36',
  current: '#44475a',
  comment: '#6272a4',
};

const CSS = /* css */ `
:host {
  --dt-bg: ${PALETTE.bg};
  --dt-comment: ${PALETTE.comment};
  --tui-line: ${PALETTE.current};

  /* The stage box the dashed frame wraps. Share these on the container when
   * you want the frame to align with the views that live inside it. */
  --box-w: min(1080px, calc(100% - 48px));
  --box-h: min(640px, calc(100vh - 150px));

  display: block;
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--dt-bg);
  overflow: hidden;
  pointer-events: none;
}
* { box-sizing: border-box; }

.frame { position: absolute; inset: 0; pointer-events: none; }
.line { position: absolute; display: block; }
.line--l {
  left: calc((100% - var(--box-w)) / 2);
  top: 0; bottom: 0;
  border-left: 1px dashed var(--dt-comment);
}
.line--r {
  right: calc((100% - var(--box-w)) / 2);
  top: 0; bottom: 0;
  border-left: 1px dashed var(--dt-comment);
}
.line--t {
  top: calc((100% - var(--box-h)) / 2);
  left: 0; right: 0;
  border-top: 1px dashed var(--dt-comment);
}
.line--b {
  bottom: calc((100% - var(--box-h)) / 2);
  left: 0; right: 0;
  border-top: 1px dashed var(--dt-comment);
}
`;

const TEMPLATE = /* html */ `
<div class="frame" aria-hidden="true">
  <i class="line line--l"></i><i class="line line--r"></i>
  <i class="line line--t"></i><i class="line line--b"></i>
</div>
`;

class TuiBg extends HTMLElement {
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      const styles = document.createElement('style');
      styles.textContent = CSS;
      const root = document.createElement('div');
      root.innerHTML = TEMPLATE;
      this.shadowRoot.append(styles, root);
    }
  }
}

if (!customElements.get('tui-bg')) {
  customElements.define('tui-bg', TuiBg);
}

export default TuiBg;
export { TuiBg };
