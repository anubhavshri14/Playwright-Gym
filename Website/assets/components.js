/* ============================================================
   Custom elements for module 08.
   Each one demonstrates a different shadow-DOM situation.
   ============================================================ */

(function () {
  'use strict';

  const BASE =
    ':host{display:block}' +
    '*{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.wrap{background:#F9FBFC;border:1px solid #C6D5E1;border-radius:3px;padding:14px}' +
    '.label{font:600 10px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;' +
      'text-transform:uppercase;color:#4A6480;display:block;margin-bottom:8px}' +
    'input{width:100%;font-size:14px;padding:7px 9px;border:1px solid #C6D5E1;border-radius:3px;background:#fff;color:#0E2038}' +
    'button{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;padding:6px 11px;border-radius:3px;' +
      'border:1px solid #0E2038;background:#0E2038;color:#fff;cursor:pointer;margin-top:8px}' +
    'button:hover{opacity:.86}' +
    '.out{font:11.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:#4A6480;margin-top:8px;word-break:break-all}';

  /* ---------- gym-panel : open root, object state ---------- */
  class GymPanel extends HTMLElement {
    constructor() {
      super();
      this._history = [];
      const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
      root.innerHTML =
        '<style>' + BASE + '</style>' +
        '<div class="wrap" part="wrap">' +
          '<span class="label" data-testid="panel-label"></span>' +
          '<input type="text" data-testid="shadow-input" placeholder="node id">' +
          '<button data-testid="shadow-submit">Register</button>' +
          '<div class="out" data-testid="shadow-out"></div>' +
        '</div>';

      this._input = root.querySelector('[data-testid="shadow-input"]');
      this._out = root.querySelector('[data-testid="shadow-out"]');

      root.querySelector('[data-testid="shadow-submit"]').addEventListener('click', () => {
        const v = this._input.value || '(empty)';
        this._history.push({ value: v, at: new Date().toISOString() });
        this._out.textContent = 'registered "' + v + '" · ' + this._history.length + ' in history';
        this.dispatchEvent(new CustomEvent('gym-panel-submit', {
          bubbles: true, composed: true,
          detail: { code: this.getAttribute('code'), value: v }
        }));
      });
    }

    connectedCallback() {
      this.shadowRoot.querySelector('[data-testid="panel-label"]').textContent =
        (this.getAttribute('label') || 'Panel') + ' · ' + (this.getAttribute('code') || '—');
    }

    /* properties with no attribute mirror */
    get value() { return this._input.value; }
    set value(v) { this._input.value = v; this._history.push({ value: v, at: new Date().toISOString(), via: 'property' }); }
    get history() { return this._history.slice(); }
    reset() { this._input.value = ''; this._out.textContent = 'reset'; this._history.length = 0; }
  }

  /* ---------- gym-nest : shadow inside shadow inside shadow ---------- */
  class GymNest extends HTMLElement {
    constructor() {
      super();
      const depth = +(this.getAttribute('depth') || 3);
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = '<style>' + BASE +
        '.wrap{background:#EDF4F9}' +
        '</style><div class="wrap"><span class="label">shadow level 1</span><div id="slot1"></div></div>';
      buildLevel(root.querySelector('#slot1'), 2, depth, this);
    }
  }

  function buildLevel(host, level, max, owner) {
    const box = document.createElement('div');
    host.appendChild(box);
    const root = box.attachShadow({ mode: 'open' });

    if (level > max) {
      root.innerHTML =
        '<style>' + BASE + '.wrap{background:#DFEBF5}</style>' +
        '<div class="wrap">' +
          '<span class="label">target · shadow level ' + level + '</span>' +
          '<input type="text" data-testid="deep-shadow-input" placeholder="the innermost field">' +
          '<button data-testid="deep-shadow-submit">Commit</button>' +
        '</div>';
      root.querySelector('button').addEventListener('click', function () {
        const v = root.querySelector('input').value || '(empty)';
        owner.dispatchEvent(new CustomEvent('gym-nest-submit', {
          bubbles: true, composed: true, detail: { depth: level, value: v }
        }));
      });
      return;
    }

    root.innerHTML =
      '<style>' + BASE + '.wrap{background:' + (level === 2 ? '#E6F0F7' : '#DFEBF5') + '}</style>' +
      '<div class="wrap"><span class="label">shadow level ' + level + '</span><div id="next"></div></div>';
    buildLevel(root.querySelector('#next'), level + 1, max, owner);
  }

  /* ---------- gym-sealed : closed root ---------- */
  class GymSealed extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'closed' });   // no public reference
      root.innerHTML =
        '<style>' + BASE + '.wrap{background:#F6E3DC;border-color:#B0401D}</style>' +
        '<div class="wrap">' +
          '<span class="label" style="color:#B0401D">closed root</span>' +
          '<input type="text" data-testid="sealed-input" value="SEALED-000">' +
          '<div class="out">Nothing outside this component can select that input.</div>' +
        '</div>';
      const input = root.querySelector('input');
      this.getCode = function () { return input.value; };
      this.setCode = function (v) { input.value = v; return v; };
    }
  }

  /* ---------- gym-card : slots ---------- */
  class GymCard extends HTMLElement {
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + BASE +
        '.hd{font:600 13px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;padding-bottom:8px;border-bottom:1px solid #DFE8EF;margin-bottom:10px}' +
        '.ft{margin-top:12px;padding-top:10px;border-top:1px solid #DFE8EF}' +
        '</style>' +
        '<div class="wrap">' +
          '<div class="hd"><slot name="title">Untitled</slot></div>' +
          '<slot name="body"><em>No body supplied</em></slot>' +
          '<div class="ft"><slot name="action"></slot></div>' +
        '</div>';
    }
  }

  /* ---------- gym-meter : exposed parts ---------- */
  class GymMeter extends HTMLElement {
    static get observedAttributes() { return ['value']; }
    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + BASE +
        '.track{height:10px;background:#DFE8EF;border-radius:5px;overflow:hidden}' +
        '.fill{height:100%;background:#1E6091;width:0;transition:width .25s ease}' +
        '.n{font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;margin-bottom:8px;display:block;color:#0E2038}' +
        '</style>' +
        '<div class="wrap">' +
          '<span class="n" data-testid="meter-label">0%</span>' +
          '<div class="track" part="track"><div class="fill" part="fill"></div></div>' +
        '</div>';
    }
    attributeChangedCallback() { this._paint(); }
    connectedCallback() { this._paint(); }
    _paint() {
      const v = Math.max(0, Math.min(100, +(this.getAttribute('value') || 0)));
      const r = this.shadowRoot;
      if (!r) return;
      r.querySelector('.fill').style.width = v + '%';
      r.querySelector('[data-testid="meter-label"]').textContent = v + '%';
    }
  }

  customElements.define('gym-panel', GymPanel);
  customElements.define('gym-nest', GymNest);
  customElements.define('gym-sealed', GymSealed);
  customElements.define('gym-card', GymCard);
  customElements.define('gym-meter', GymMeter);
})();
