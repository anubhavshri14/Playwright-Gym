/* ============================================================
   GymCal — the calendar engine behind module 04.
   Deliberately renders leading/trailing days so day numbers
   repeat inside one grid, and can be configured to withhold
   data-date so tests have to rely on text plus position.
   ============================================================ */

(function () {
  'use strict';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const groups = {};

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }

  function create(el, opts) {
    opts = opts || {};
    const today = opts.today || new Date();
    const start = new Date(today.getFullYear(), today.getMonth() + (opts.monthOffset || 0), 1);

    const state = {
      y: start.getFullYear(),
      m: start.getMonth(),
      mode: 'days',
      selected: opts.value || null
    };

    const api = {
      el: el,
      state: state,
      render: render,
      shift: shift,
      setView: function (y, m) { state.y = y; state.m = m; render(); }
    };

    if (opts.group) {
      groups[opts.group] = groups[opts.group] || [];
      groups[opts.group].push(api);
    }

    function shift(delta, fromGroup) {
      const d = new Date(state.y, state.m + delta, 1);
      state.y = d.getFullYear(); state.m = d.getMonth();
      render();
      if (opts.group && !fromGroup) {
        groups[opts.group].forEach(function (peer) { if (peer !== api) peer.shift(delta, true); });
      }
    }

    function isDisabled(dateIso, dateObj) {
      if (opts.min && dateIso < opts.min) return true;
      if (opts.max && dateIso > opts.max) return true;
      if (typeof opts.disable === 'function' && opts.disable(dateIso, dateObj)) return true;
      return false;
    }

    function daysView() {
      const first = new Date(state.y, state.m, 1);
      const lead = (first.getDay() + 6) % 7;          // Monday-first
      const gridStart = new Date(state.y, state.m, 1 - lead);
      const range = typeof opts.rangeGetter === 'function' ? opts.rangeGetter() : null;
      const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());

      let cells = '';
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
        const dIso = iso(d.getFullYear(), d.getMonth(), d.getDate());
        const outside = d.getMonth() !== state.m;
        if (outside && !opts.showOutside) { cells += '<span></span>'; continue; }

        const disabled = isDisabled(dIso, d);
        const isSel = state.selected === dIso ||
                      (range && (range.start === dIso || range.end === dIso));
        const inRange = range && range.start && range.end && dIso > range.start && dIso < range.end;
        const ev = opts.events && opts.events[dIso];

        cells +=
          '<button type="button" class="cal__day" data-testid="cal-day"' +
          (opts.dataDate ? ' data-date="' + dIso + '"' : '') +
          ' data-outside="' + outside + '"' +
          (dIso === todayIso ? ' data-today="true"' : '') +
          (inRange ? ' data-in-range="true"' : '') +
          ' aria-selected="' + (isSel ? 'true' : 'false') + '"' +
          ' aria-label="' + d.toDateString() + '"' +
          (disabled ? ' disabled' : '') +
          ' data-idx="' + i + '">' +
            '<span style="display:block;line-height:1.1">' + d.getDate() + '</span>' +
            '<span aria-hidden="true" style="display:block;width:4px;height:4px;border-radius:50%;margin:2px auto 0;background:' +
              (ev ? 'var(--rust)' : 'transparent') + '"></span>' +
          '</button>';
      }

      return '<div class="cal__grid" data-testid="cal-grid">' +
        DOW.map(function (d) { return '<div class="cal__dow">' + d.slice(0, 2) + '</div>'; }).join('') +
        cells + '</div>';
    }

    function monthsView() {
      return '<div class="cal__months" data-testid="cal-months">' +
        MONTHS.map(function (name, i) {
          return '<button type="button" data-month="' + i + '" data-testid="cal-month">' + name.slice(0, 3) + '</button>';
        }).join('') + '</div>';
    }

    function yearsView() {
      const base = state.y - (state.y % 12);
      let out = '';
      for (let i = 0; i < 12; i++) {
        out += '<button type="button" data-year="' + (base + i) + '" data-testid="cal-year">' + (base + i) + '</button>';
      }
      return '<div class="cal__years" data-testid="cal-years">' + out + '</div>';
    }

    function render() {
      const title = state.mode === 'days'
        ? MONTHS[state.m] + ' ' + state.y
        : state.mode === 'months' ? String(state.y)
        : (state.y - (state.y % 12)) + '–' + (state.y - (state.y % 12) + 11);

      el.innerHTML =
        '<div class="cal__bar">' +
          '<button type="button" class="cal__nav" data-nav="-1" data-testid="cal-prev" aria-label="Previous">‹</button>' +
          '<span class="cal__title" data-testid="cal-title"' +
            (opts.drilldown ? ' role="button" tabindex="0"' : '') + '>' + title + '</span>' +
          '<button type="button" class="cal__nav" data-nav="1" data-testid="cal-next" aria-label="Next">›</button>' +
        '</div>' +
        (state.mode === 'days' ? daysView() : state.mode === 'months' ? monthsView() : yearsView()) +
        '<div class="cal__foot">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-jump="today" data-testid="cal-today">Today</button>' +
          '<button type="button" class="btn btn--ghost btn--sm" data-jump="clear" data-testid="cal-clear">Clear</button>' +
        '</div>';
    }

    el.addEventListener('click', function (e) {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const dir = +nav.dataset.nav;
        if (state.mode === 'days') shift(dir);
        else if (state.mode === 'months') { state.y += dir; render(); }
        else { state.y += dir * 12; render(); }
        return;
      }

      if (opts.drilldown && e.target.closest('[data-testid="cal-title"]')) {
        state.mode = state.mode === 'days' ? 'months' : state.mode === 'months' ? 'years' : 'days';
        render();
        return;
      }

      const mo = e.target.closest('[data-month]');
      if (mo) { state.m = +mo.dataset.month; state.mode = 'days'; render(); return; }

      const yr = e.target.closest('[data-year]');
      if (yr) { state.y = +yr.dataset.year; state.mode = 'months'; render(); return; }

      const jump = e.target.closest('[data-jump]');
      if (jump) {
        if (jump.dataset.jump === 'today') { state.y = today.getFullYear(); state.m = today.getMonth(); state.mode = 'days'; }
        else { state.selected = null; if (opts.onClear) opts.onClear(); }
        render();
        return;
      }

      const day = e.target.closest('.cal__day');
      if (day && !day.disabled) {
        const idx = +day.dataset.idx;
        const first = new Date(state.y, state.m, 1);
        const lead = (first.getDay() + 6) % 7;
        const d = new Date(state.y, state.m, 1 - lead + idx);
        const value = iso(d.getFullYear(), d.getMonth(), d.getDate());
        state.selected = value;
        if (day.dataset.outside === 'true') { state.y = d.getFullYear(); state.m = d.getMonth(); }
        render();
        if (opts.onPick) opts.onPick(value, d);
      }
    });

    render();
    return api;
  }

  window.GymCal = { create: create, MONTHS: MONTHS };
})();
