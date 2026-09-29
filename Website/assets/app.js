/* ============================================================
   Locator Gym — shared runtime
   Builds the nav rail, the activity log, and X-ray mode.
   Also exposes small helpers used by the module pages.
   ============================================================ */

(function () {
  'use strict';

  const ROOT = document.body.dataset.root || '';

  const MODULES = [
    { href: 'index.html',            no: '00', label: 'Bench' },
    { href: 'pages/controls.html',   no: '01', label: 'Form controls' },
    { href: 'pages/tables.html',     no: '02', label: 'Dynamic tables' },
    { href: 'pages/accordions.html', no: '03', label: 'Accordions' },
    { href: 'pages/calendars.html',  no: '04', label: 'Calendars' },
    { href: 'pages/files.html',      no: '05', label: 'Upload & download' },
    { href: 'pages/frames.html',     no: '06', label: 'Nested iframes' },
    { href: 'pages/dom.html',        no: '07', label: 'Hostile DOM' },
    { href: 'pages/shadow.html',     no: '08', label: 'Shadow DOM' },
    { href: 'pages/overlays.html',   no: '09', label: 'Overlays & chrome' },
    { href: 'pages/lists.html',      no: '10', label: 'Lists that lie' },
    { href: 'pages/network.html',    no: '11', label: 'Network gym' },
    { href: 'pages/session.html',    no: '12', label: 'Auth & tabs' },
    { href: 'pages/widgets.html',    no: '13', label: 'Design-system' },
    { href: 'pages/origins.html',    no: '14', label: 'Origins & permissions' }
  ];

  /* ---------- Nav rail ---------- */

  function buildRail() {
    const rail = document.querySelector('[data-rail]');
    if (!rail) return;

    const here = location.pathname.split('/').filter(Boolean).slice(-2).join('/');

    const links = MODULES.map(function (m) {
      const active = here.endsWith(m.href) || (m.href === 'index.html' && /\/$/.test(location.pathname));
      return (
        '<a class="rail__link" href="' + ROOT + m.href + '" data-testid="nav-' + m.no + '"' +
        (active ? ' aria-current="page"' : '') + '>' +
        '<span class="rail__idx">' + m.no + '</span><span>' + m.label + '</span></a>'
      );
    }).join('');

    rail.innerHTML =
      '<div class="rail__brand">' +
        '<a class="rail__mark" href="' + ROOT + 'index.html">locator<span>.gym</span></a>' +
        '<div class="rail__sub">Playwright practice rig</div>' +
      '</div>' +
      '<div class="rail__group">Modules</div>' +
      links +
      '<label class="xray-toggle" data-testid="xray-toggle">' +
        '<input type="checkbox" id="xray-switch"><span>X-ray test IDs</span>' +
      '</label>' +
      '<label class="xray-toggle" data-testid="hide-testid-toggle">' +
        '<input type="checkbox" id="hide-testid-switch"><span>Hide test IDs</span>' +
      '</label>';

    const sw = rail.querySelector('#xray-switch');
    const hide = rail.querySelector('#hide-testid-switch');
    const saved = sessionStorage.getItem('gym-xray') === '1';
    if (saved) { document.body.classList.add('xray'); sw.checked = true; setXray(true); }
    sw.addEventListener('change', function () {
      document.body.classList.toggle('xray', sw.checked);
      sessionStorage.setItem('gym-xray', sw.checked ? '1' : '0');
      setXray(sw.checked);
      log('xray', sw.checked ? 'on' : 'off');
    });
    if (sessionStorage.getItem('gym-hide-testid') === '1') {
      hide.checked = true;
      setHideTestIds(true);
    }
    hide.addEventListener('change', function () {
      sessionStorage.setItem('gym-hide-testid', hide.checked ? '1' : '0');
      setHideTestIds(hide.checked);
      log('hide-testid', hide.checked ? 'on' : 'off');
    });
  }


  function setHideTestIds(on) {
    document.body.classList.toggle('hide-testids', on);
    const scope = document.querySelector('.main') || document.body;
    scope.querySelectorAll(on ? '[data-testid]' : '[data-was-testid]').forEach(function (el) {
      if (on) {
        el.setAttribute('data-was-testid', el.getAttribute('data-testid'));
        el.removeAttribute('data-testid');
      } else {
        el.setAttribute('data-testid', el.getAttribute('data-was-testid'));
        el.removeAttribute('data-was-testid');
      }
    });
    if (on) setXray(false);
    else if (document.getElementById('xray-switch') && document.getElementById('xray-switch').checked) setXray(true);
  }

  /* ---------- X-ray overlay ----------
     A CSS ::after cannot label replaced elements such as inputs and
     iframes, and those are exactly the ones worth labelling here — so the
     tags are drawn in a separate fixed layer and repositioned on demand. */

  let xrayOn = false, xrayLayer = null, xrayQueued = false;

  function setXray(on) {
    xrayOn = on;
    if (on) {
      if (!xrayLayer) {
        xrayLayer = document.createElement('div');
        xrayLayer.id = 'xray-layer';
        document.body.appendChild(xrayLayer);
        addEventListener('scroll', queueXray, true);
        addEventListener('resize', queueXray);
      }
      paintXray();
    } else if (xrayLayer) {
      xrayLayer.innerHTML = '';
    }
  }

  function queueXray() {
    if (!xrayOn || xrayQueued) return;
    xrayQueued = true;
    requestAnimationFrame(function () { xrayQueued = false; paintXray(); });
  }

  function paintXray() {
    if (!xrayOn || !xrayLayer) return;
    const main = document.querySelector('.main');
    if (!main) return;
    const parts = [];
    main.querySelectorAll('[data-testid]').forEach(function (el) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      if (r.bottom < 0 || r.top > innerHeight) return;
      parts.push('<span class="xray-tag" style="left:' + Math.max(2, r.left) +
                 'px;top:' + Math.max(9, r.top) + 'px">' + el.dataset.testid + '</span>');
    });
    xrayLayer.innerHTML = parts.join('');
  }

  // Re-measure after the page settles and whenever the content changes shape.
  // Scoped to .main so the overlay never observes its own writes.
  (function () {
    const main = document.querySelector('.main');
    if (!main) return;
    setTimeout(queueXray, 400);
    new MutationObserver(queueXray).observe(main, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style']
    });
  })();

  /* ---------- Activity log ---------- */

  let logCount = 0;

  function buildLog() {
    if (document.body.classList.contains('in-frame')) return;
    const bar = document.createElement('div');
    bar.className = 'logbar';
    bar.innerHTML =
      '<div class="logbar__head" data-testid="log-toggle" role="button" tabindex="0" aria-expanded="true">' +
        '<span class="logbar__dot"></span><span>Activity log</span>' +
        '<span class="logbar__count" data-testid="log-count">0 events</span>' +
      '</div>' +
      '<div class="logbar__body" data-testid="log-body"></div>';
    document.body.appendChild(bar);

    const head = bar.querySelector('.logbar__head');
    const body = bar.querySelector('.logbar__body');
    function toggle() {
      const open = body.hasAttribute('hidden');
      body.toggleAttribute('hidden', !open);
      head.setAttribute('aria-expanded', String(open));
    }
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  }

  function log(kind, detail) {
    const body = document.querySelector('.logbar__body');
    if (!body) return;
    logCount++;
    const t = new Date().toTimeString().slice(0, 8);
    const row = document.createElement('div');
    row.className = 'logbar__row';
    row.dataset.testid = 'log-row';
    row.innerHTML =
      '<span class="logbar__t">' + t + '</span>' +
      '<span class="logbar__k">' + kind + '</span>' +
      '<span>' + String(detail) + '</span>';
    body.appendChild(row);
    body.scrollTop = body.scrollHeight;
    const c = document.querySelector('[data-testid="log-count"]');
    if (c) c.textContent = logCount + (logCount === 1 ? ' event' : ' events');
  }

  /* ---------- Message bridge, so frames can log to the top window ---------- */

  window.addEventListener('message', function (e) {
    if (e.data && e.data.__gym === 'log') log(e.data.kind, e.data.detail);
  });

  /* ---------- Helpers exposed to pages ---------- */

  const Gym = {
    log: function (kind, detail) {
      if (window.top !== window.self) {
        try { window.top.postMessage({ __gym: 'log', kind: kind, detail: detail }, '*'); } catch (_) {}
      }
      log(kind, detail);
    },
    /** Random-ish id that changes on every page load. */
    rid: function (prefix) {
      return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9);
    },
    sleep: function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); },
    out: function (sel, text) {
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (el) el.textContent = text;
    },
    money: function (n) { return '$' + n.toFixed(2); },
    pad: function (n) { return String(n).padStart(2, '0'); },
    iso: function (d) { return d.getFullYear() + '-' + Gym.pad(d.getMonth() + 1) + '-' + Gym.pad(d.getDate()); },
    originPort: function () {
      const p = Number(location.port || 4173);
      return p + 1;
    },
    widgetOrigin: function () {
      return 'http://127.0.0.1:' + Gym.originPort();
    }
  };

  window.Gym = Gym;

  /* ---------- Boot ---------- */

  buildRail();
  buildLog();

  // Global observers: every labelled control reports to the log.
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-log]');
    if (t) Gym.log('click', t.getAttribute('data-log'));
  });

  document.addEventListener('change', function (e) {
    const t = e.target.closest('[data-log-change]');
    if (t) {
      const v = t.type === 'checkbox' ? t.checked : (t.value || '').slice(0, 60);
      Gym.log('change', t.getAttribute('data-log-change') + ' → ' + v);
    }
  }, true);
})();
