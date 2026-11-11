/* =============================================================================
   Lofi Studio Pro — ui.js
   Rendering, the custom knob/fader controls, and every piece of DOM the app
   owns. No audio calls here: the UI mutates LS.State and calls LS.Audio.
   ========================================================================== */
(function (LS) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var el = {};
  var pads = [];          // pads[step][trackIndex] = button
  var knobs = {};
  var lastStep = -1;
  var toastCount = 0;

  /* ------------------------------------------------------------------ drag
     One pointer handler drives both knobs and faders. Vertical drag is the
     primary axis; horizontal is accepted too so a sideways flick still works
     on a phone. Shift slows it down for fine adjustment. */
  function makeDrag(node, opts) {
    var dragging = false, startY = 0, startX = 0, startVal = 0;

    function valueFrom(dy, dx, fine) {
      var span = opts.max - opts.min;
      var delta = -(dy + dx) / (fine ? 900 : 190) * span;
      return Math.min(opts.max, Math.max(opts.min, startVal + delta));
    }

    node.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      startY = e.clientY; startX = e.clientX; startVal = opts.get();
      node.setPointerCapture(e.pointerId);
      node.classList.add('is-dragging');
      e.preventDefault();
    });

    node.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      opts.set(valueFrom(e.clientY - startY, e.clientX - startX, e.shiftKey));
    });

    function end(e) {
      if (!dragging) return;
      dragging = false;
      node.classList.remove('is-dragging');
      try { node.releasePointerCapture(e.pointerId); } catch (err) {}
      if (opts.onCommit) opts.onCommit();
    }
    node.addEventListener('pointerup', end);
    node.addEventListener('pointercancel', end);

    node.addEventListener('dblclick', function () {
      if (opts.def !== undefined) opts.set(opts.def);
    });

    node.addEventListener('wheel', function (e) {
      e.preventDefault();
      var step = (opts.max - opts.min) / 100;
      opts.set(opts.get() + (e.deltaY < 0 ? step : -step) * (e.shiftKey ? 0.25 : 1));
    }, { passive: false });

    node.addEventListener('keydown', function (e) {
      var span = opts.max - opts.min;
      var big = e.shiftKey ? span / 10 : span / 100;
      var v = opts.get(), handled = true;
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') opts.set(v + big);
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') opts.set(v - big);
      else if (e.key === 'Home') opts.set(opts.min);
      else if (e.key === 'End') opts.set(opts.max);
      else handled = false;
      if (handled) { e.preventDefault(); e.stopPropagation(); }
    });
  }

  /* ------------------------------------------------------------------ knob */
  var ARC = 0.75; // 270 degrees of travel
  function knob(host, opts) {
    var size = opts.size || 56;
    host.className = 'knob' + (opts.size === 44 ? ' knob-sm' : '');
    host.setAttribute('role', 'slider');
    host.setAttribute('tabindex', '0');
    host.setAttribute('aria-label', opts.label);
    host.setAttribute('aria-valuemin', opts.min);
    host.setAttribute('aria-valuemax', opts.max);
    host.innerHTML =
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle class="knob-track" cx="24" cy="24" r="19"></circle>' +
      '<circle class="knob-fill" cx="24" cy="24" r="19"></circle>' +
      '<circle class="knob-hub" cx="24" cy="24" r="13"></circle>' +
      '<line class="knob-tick" x1="24" y1="8" x2="24" y2="14"></line>' +
      '</svg>' +
      '<span class="knob-val"></span>';

    var fill = host.querySelector('.knob-fill');
    var tick = host.querySelector('.knob-tick');
    var out = host.querySelector('.knob-val');
    var C = 2 * Math.PI * 19;
    fill.style.strokeDasharray = (C * ARC) + ' ' + C;
    fill.style.strokeDashoffset = '0';

    var ctl = {
      set: function (v) {
        v = Math.round(v);
        opts.onChange(v);
        paint(v);
      }
    };
    function paint(v) {
      var f = (v - opts.min) / (opts.max - opts.min);
      fill.style.strokeDasharray = (C * ARC * f) + ' ' + C;
      tick.style.transform = 'rotate(' + (-135 + 270 * f) + 'deg)';
      tick.style.transformOrigin = '24px 24px';
      out.textContent = opts.format ? opts.format(v) : v;
      host.setAttribute('aria-valuenow', v);
      host.setAttribute('aria-valuetext', opts.format ? opts.format(v) : String(v));
    }

    makeDrag(host, {
      min: opts.min, max: opts.max, def: opts.def,
      get: function () { return parseFloat(host.getAttribute('aria-valuenow')) || opts.min; },
      set: ctl.set
    });
    paint(opts.get());
    return ctl;
  }

  /* ----------------------------------------------------------------- fader */
  function fader(host, opts) {
    host.className = 'fader';
    host.setAttribute('role', 'slider');
    host.setAttribute('tabindex', '0');
    host.setAttribute('aria-label', opts.label);
    host.setAttribute('aria-valuemin', '0');
    host.setAttribute('aria-valuemax', '100');
    host.innerHTML = '<div class="fader-rail"><div class="fader-fill"></div><div class="fader-cap"></div></div>';
    var fill = host.querySelector('.fader-fill');
    var cap = host.querySelector('.fader-cap');

    function paint(v) {
      fill.style.height = v + '%';
      cap.style.bottom = 'calc(' + v + '% - 9px)';
      host.setAttribute('aria-valuenow', v);
      host.setAttribute('aria-valuetext', v + '%');
    }
    makeDrag(host, {
      min: 0, max: 100, def: 80,
      get: function () { return parseFloat(host.getAttribute('aria-valuenow')) || 0; },
      set: function (v) { v = Math.round(v); opts.onChange(v); paint(v); }
    });
    paint(opts.get());
    return { paint: paint };
  }

  /* ---------------------------------------------------------------- toasts */
  function toast(msg, kind, action) {
    if (!el.toasts) return;
    if (toastCount >= 3) {
      var first = el.toasts.firstElementChild;
      if (first) first.remove(), toastCount--;
    }
    var t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.setAttribute('role', 'status');
    t.innerHTML = '<span class="toast-msg"></span>';
    t.querySelector('.toast-msg').textContent = msg;
    if (action) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-act';
      b.textContent = action.label;
      b.addEventListener('click', function (e) { e.stopPropagation(); action.fn(); t.remove(); toastCount--; });
      t.appendChild(b);
    }
    el.toasts.appendChild(t);
    toastCount++;
    var kill = setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); toastCount--; }, 200);
    }, action ? 9000 : 2600);
    t.addEventListener('click', function () { clearTimeout(kill); t.remove(); toastCount--; });
  }

  /* ------------------------------------------------------------ sequencer */
  function buildSequencer() {
    el.seq.innerHTML = '';
    pads = [];
    for (var s = 0; s < LS.STEP_COUNT; s++) pads.push([]);

    LS.TRACK_IDS.forEach(function (id, rowIndex) {
      var meta = LS.TRACKS[id];
      var row = document.createElement('div');
      row.className = 'seq-row';
      row.setAttribute('role', 'row');

      /* The whole track label is the mute switch: a 96 x 44 target instead of
         two 22px letter buttons, and one tap away from the pads. */
      var head = document.createElement('button');
      head.type = 'button';
      head.className = 'seq-head';
      head.setAttribute('role', 'rowheader');
      head.setAttribute('data-mute', id);
      head.setAttribute('aria-pressed', 'false');
      head.setAttribute('aria-label', 'Mute ' + meta.label);
      head.innerHTML =
        '<span class="seq-dot" style="--c:' + meta.color + '"></span>' +
        '<span class="seq-name">' + meta.label + '</span>';
      bindTrackClear(head, id);
      row.appendChild(head);

      for (var i = 0; i < LS.STEP_COUNT; i++) {
        var p = document.createElement('button');
        p.type = 'button';
        p.className = 'pad' + (i % 4 === 0 ? ' bar' : '');
        p.setAttribute('role', 'gridcell');
        p.dataset.track = id;
        p.dataset.step = String(i);
        p.style.setProperty('--c', meta.color);
        p.tabIndex = (rowIndex === 0 && i === 0) ? 0 : -1;
        bindPadPress(p);
        p.addEventListener('keydown', onPadKey);
        pads[i].push(p);
        row.appendChild(p);
      }
      el.seq.appendChild(row);
    });
    paintSequencer();
  }

  function paintSequencer() {
    var S = LS.State.data;
    LS.TRACK_IDS.forEach(function (id, r) {
      for (var i = 0; i < LS.STEP_COUNT; i++) {
        var p = pads[i][r];
        var v = S.steps[id][i] | 0;
        p.classList.toggle('on', !!v);
        p.setAttribute('data-vel', String(v));
        p.setAttribute('aria-pressed', v ? 'true' : 'false');
        var word = v === 2 ? 'accent' : v === 3 ? 'ghost' : v ? 'on' : 'off';
        p.setAttribute('aria-label', LS.TRACKS[id].label + ' step ' + (i + 1) + ', ' + word);
      }
    });
  }

  /* Tap toggles a step, hold cycles its weight, drag paints a run of steps.
     One gesture set, no mode to enter. */
  var paint = null;
  var justDragged = false;

  function padAt(x, y) {
    var hit = document.elementFromPoint(x, y);
    return (hit && hit.classList && hit.classList.contains('pad')) ? hit : null;
  }

  function writeStep(id, i, val) {
    var S = LS.State.data;
    if (S.steps[id][i] === val) return false;
    S.steps[id][i] = val;
    S.patternId = null;
    return true;
  }

  function bindPadPress(p) {
    p.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      var id = p.dataset.track, i = parseInt(p.dataset.step, 10);
      var timer = setTimeout(function () {
        paint = null;                 // a hold is not a drag
        cycleVelocity(id, i);
      }, 420);
      paint = {
        value: LS.State.data.steps[id][i] ? 0 : 1,
        origin: { id: id, i: i },
        x: e.clientX, y: e.clientY, moved: false, changed: false, timer: timer
      };
    });
    p.addEventListener('click', function () {
      if (justDragged) { justDragged = false; return; }
      toggleStep(p.dataset.track, parseInt(p.dataset.step, 10));
    });
  }

  /* Registered once, on the document: a drag that leaves its starting pad still
     paints, and a pointer that ends anywhere still commits. */
  function bindPaintGestures() {
    document.addEventListener('pointermove', function (e) {
      if (!paint) return;
      if (!paint.moved && Math.abs(e.clientX - paint.x) + Math.abs(e.clientY - paint.y) < 8) return;
      if (!paint.moved) {
        clearTimeout(paint.timer);
        paint.moved = true;
        /* the pad the gesture started on belongs to the run as well */
        if (writeStep(paint.origin.id, paint.origin.i, paint.value)) {
          paint.changed = true;
          paintSequencer();
        }
      }
      var pad = padAt(e.clientX, e.clientY);
      if (!pad) return;
      if (writeStep(pad.dataset.track, parseInt(pad.dataset.step, 10), paint.value)) {
        paint.changed = true;
        paintSequencer();
      }
    });

    document.addEventListener('pointerup', function () {
      if (!paint) return;
      clearTimeout(paint.timer);
      if (paint.moved) {
        justDragged = true;
        if (paint.changed) {
          paintPatterns();
          paintNowPlaying();
          LS.State.saveSoon();
        }
      }
      paint = null;
    });
  }

  /* Hold a track name to empty that row — building from scratch otherwise means
     tapping forty pads off. The undo toast is the safety net. */
  function bindTrackClear(head, id) {
    var timer = null, held = false;
    head.addEventListener('pointerdown', function () {
      held = false;
      timer = setTimeout(function () {
        held = true;
        var before = LS.State.data.steps[id].slice();
        if (before.every(function (v) { return !v; })) return;
        LS.State.data.steps[id] = new Array(LS.STEP_COUNT).fill(0);
        LS.State.data.patternId = null;
        paintSequencer(); paintPatterns(); paintNowPlaying();
        LS.State.saveSoon();
        toast(LS.TRACKS[id].label + ' cleared', 'info', {
          label: 'Undo',
          fn: function () {
            LS.State.data.steps[id] = before;
            paintSequencer();
            LS.State.saveSoon();
          }
        });
      }, 600);
    });
    head.addEventListener('pointerup', function () { clearTimeout(timer); });
    head.addEventListener('pointerleave', function () { clearTimeout(timer); });
    head.addEventListener('click', function (e) {
      if (held) { held = false; e.stopPropagation(); e.preventDefault(); }
    }, true);
  }

  function cycleVelocity(id, i) {
    var S = LS.State.data;
    var cur = S.steps[id][i] | 0;
    var next = cur === 0 ? 1 : cur === 1 ? 2 : cur === 2 ? 3 : 1;
    S.steps[id][i] = next;
    S.patternId = null;
    paintSequencer();
    paintPatterns();
    paintNowPlaying();
    if (next === 2) LS.Audio.audition(id);
    LS.State.saveSoon();
    if (next === 2) toast('Accent', 'info');
    else if (next === 3) toast('Ghost note', 'info');
  }

  function onPadKey(e) {
    var b = e.currentTarget;
    var t = LS.TRACK_IDS.indexOf(b.dataset.track);
    var i = parseInt(b.dataset.step, 10);
    var nt = t, ni = i;
    if (e.key === 'ArrowRight') ni = Math.min(LS.STEP_COUNT - 1, i + 1);
    else if (e.key === 'ArrowLeft') ni = Math.max(0, i - 1);
    else if (e.key === 'ArrowDown') nt = Math.min(LS.TRACK_IDS.length - 1, t + 1);
    else if (e.key === 'ArrowUp') nt = Math.max(0, t - 1);
    else return;

    e.preventDefault();
    var next = pads[ni][nt];
    if (!next) return;
    pads[i][t].tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  }

  function toggleStep(id, i) {
    var S = LS.State.data;
    var on = S.steps[id][i] ? 0 : 1;
    S.steps[id][i] = on;
    S.patternId = null;
    paintSequencer();
    paintPatterns();
    paintNowPlaying();
    if (on) LS.Audio.audition(id);
    LS.State.saveSoon();
  }

  /* -------------------------------------------------------------- surfaces */
  function buildPresets() {
    el.presets.innerHTML = '';
    LS.PRESET_ORDER.forEach(function (id) {
      var p = LS.PRESETS[id];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill';
      b.dataset.preset = id;
      b.setAttribute('aria-pressed', 'false');
      b.textContent = p.name;
      b.addEventListener('click', function () { LS.App.applyPreset(id); });
      el.presets.appendChild(b);
    });
  }

  function buildPatterns() {
    el.patterns.innerHTML = '';
    LS.PATTERN_ORDER.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.pattern = id;
      b.textContent = LS.PATTERNS[id].name;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { LS.App.loadPattern(id); });
      el.patterns.appendChild(b);
    });
  }

  function buildVibes() {
    el.vibes.innerHTML = '';
    LS.VIBE_ORDER.forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.dataset.vibe = id;
      b.textContent = LS.VIBES[id].name;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { LS.App.setVibe(id); });
      el.vibes.appendChild(b);
    });
  }

  function buildMixer() {
    el.faders.innerHTML = '';
    LS.TRACK_IDS.forEach(function (id) {
      var m = LS.TRACKS[id];
      var wrap = document.createElement('div');
      wrap.className = 'strip';
      wrap.innerHTML = '<span class="strip-label" style="--c:' + m.color + '">' + m.short + '</span>';

      var f = document.createElement('div');
      wrap.appendChild(f);

      var pan = document.createElement('input');
      pan.type = 'range';
      pan.className = 'pan';
      pan.min = '-100'; pan.max = '100'; pan.step = '5';
      pan.value = String(LS.State.data.tracks[id].pan || 0);
      pan.setAttribute('aria-label', m.label + ' pan');
      pan.style.setProperty('--fill', ((LS.State.data.tracks[id].pan || 0) + 100) / 2 + '%');
      pan.addEventListener('input', function () {
        var v = parseInt(pan.value, 10);
        LS.State.data.tracks[id].pan = v;
        pan.style.setProperty('--fill', (v + 100) / 2 + '%');
        LS.Audio.setTrackPan(id, v);
        LS.State.saveSoon();
      });
      wrap.appendChild(pan);

      var tools = document.createElement('div');
      tools.className = 'strip-tools';
      tools.innerHTML =
        '<button class="mini" type="button" data-mute="' + id + '" aria-pressed="false" aria-label="Mute ' + m.label + '">M</button>' +
        '<button class="mini" type="button" data-solo="' + id + '" aria-pressed="false" aria-label="Solo ' + m.label + '">S</button>';
      wrap.appendChild(tools);

      el.faders.appendChild(wrap);

      fader(f, {
        label: m.label + ' volume',
        get: function () { return LS.State.data.tracks[id].vol; },
        onChange: function (v) {
          LS.State.data.tracks[id].vol = v;
          LS.Audio.setTrackVol(id, v);
          LS.State.saveSoon();
        }
      });
    });
  }

  function buildFx() {
    el.knobs.innerHTML = '';
    var defs = [
      { k: 'filter', label: 'Low-pass filter', min: 400, max: 12000, step: 100,
        fmt: function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v; },
        set: LS.Audio.setFilter },
      { k: 'tape', label: 'Tape saturation', min: 0, max: 100, fmt: pct, set: LS.Audio.setTape },
      { k: 'crackle', label: 'Vinyl crackle', min: 0, max: 100, fmt: pct, set: LS.Audio.setCrackle },
      { k: 'reverb', label: 'Reverb', min: 0, max: 100, fmt: pct, set: LS.Audio.setReverb },
      { k: 'chorus', label: 'Chorus', min: 0, max: 100, fmt: pct, set: LS.Audio.setChorus },
      { k: 'wow', label: 'Wow and flutter', min: 0, max: 100, fmt: pct, set: LS.Audio.setWow }
    ];
    defs.forEach(function (d) {
      var cell = document.createElement('div');
      cell.className = 'fx-cell';
      var host = document.createElement('div');
      cell.appendChild(host);
      var lab = document.createElement('span');
      lab.className = 'fx-label';
      lab.textContent = d.label;
      cell.appendChild(lab);
      el.knobs.appendChild(cell);

      knobs[d.k] = knob(host, {
        label: d.label, min: d.min, max: d.max,
        def: LS.defaults().fx[d.k],
        format: d.fmt,
        get: function () { return LS.State.data.fx[d.k]; },
        onChange: function (v) {
          LS.State.data.fx[d.k] = v;
          d.set(v);
          LS.State.saveSoon();
        }
      });
    });
  }

  function pct(v) { return v + '%'; }

  function buildAmbience() {
    el.amb.innerHTML = '';
    LS.AMBIENCE.forEach(function (a) {
      var tile = document.createElement('div');
      tile.className = 'amb-tile';
      tile.dataset.amb = a.id;
      tile.innerHTML =
        '<button class="amb-head" type="button" role="switch" aria-checked="false" aria-label="' + a.name + ' ambience">' +
        '<svg class="amb-icon" viewBox="0 0 24 24" aria-hidden="true">' + a.svg + '</svg>' +
        '<span class="amb-name">' + a.name + '</span>' +
        '<span class="amb-led" aria-hidden="true"></span>' +
        '</button>' +
        '<input class="amb-vol" type="range" min="0" max="100" step="1" aria-label="' + a.name + ' volume">';

      var toggle = tile.querySelector('.amb-head');
      var slider = tile.querySelector('.amb-vol');

      toggle.addEventListener('click', function () {
        if (toggle.disabled) return;
        toggle.disabled = true;
        LS.App.toggleAmbience(a.id).then(function () {
          toggle.disabled = false;
        });
      });

      slider.addEventListener('input', function () {
        var v = parseInt(slider.value, 10);
        LS.State.data.amb[a.id].vol = v;
        slider.style.setProperty('--fill', v + '%');
        LS.Audio.ambienceVol(a.id, v);
        LS.State.saveSoon();
      });

      el.amb.appendChild(tile);
    });
    paintAmbience();
  }

  function paintAmbience() {
    var S = LS.State.data;
    Array.prototype.forEach.call(el.amb.children, function (tile) {
      var id = tile.dataset.amb;
      var on = S.amb[id].on;
      tile.classList.toggle('on', on);
      var btn = tile.querySelector('.amb-head');
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      var slider = tile.querySelector('.amb-vol');
      slider.value = String(S.amb[id].vol);
      slider.style.setProperty('--fill', S.amb[id].vol + '%');
    });
  }

  function buildThemes() {
    el.themes.innerHTML = '';
    LS.THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.dataset.theme = t.id;
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', t.name + ' theme');
      b.style.setProperty('--sw-a', t.acc);
      b.style.setProperty('--sw-b', t.acc2);
      b.style.setProperty('--sw-bg', t.bg);
      b.innerHTML = '<span class="sw-dot"></span><span class="sw-name">' + t.name + '</span>';
      b.addEventListener('click', function () { LS.App.applyTheme(t.id); });
      el.themes.appendChild(b);
    });
  }

  /* --------------------------------------------------------------- presets */
  function renderPresets() {
    var host = document.getElementById('preset-list');
    if (!host) return;
    var list = LS.State.presets();
    host.innerHTML = '';
    if (!list.length) {
      host.innerHTML = '<p class="p-empty">Nothing saved yet. Build something, name it, save it.</p>';
      return;
    }
    list.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'preset-row';
      row.innerHTML =
        '<span class="p-name"></span>' +
        '<span class="p-meta"></span>' +
        '<button class="btn btn-sm" type="button" data-load>Load</button>' +
        '<button class="icon icon-sm" type="button" data-del aria-label="Delete preset">' +
        '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      row.querySelector('.p-name').textContent = p.name;
      var d = new Date(p.at);
      row.querySelector('.p-meta').textContent = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      row.querySelector('[data-load]').addEventListener('click', function () {
        LS.App.loadPreset(p.id);
      });
      row.querySelector('[data-del]').addEventListener('click', function () {
        LS.App.deletePreset(p.id);
      });
      host.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------- paints */
  function paintPatterns() {
    var S = LS.State.data;
    Array.prototype.forEach.call(el.patterns.children, function (b) {
      var on = b.dataset.pattern === S.patternId;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function paintVibes() {
    Array.prototype.forEach.call(el.vibes.children, function (b) {
      var on = b.dataset.vibe === LS.State.data.vibe;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function paintPresets() {
    Array.prototype.forEach.call(el.presets.children, function (b) {
      var on = b.dataset.preset === LS.State.data.preset;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function paintThemes() {
    Array.prototype.forEach.call(el.themes.children, function (b) {
      var on = b.dataset.theme === LS.State.data.theme;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function paintTracks() {
    var S = LS.State.data;
    document.querySelectorAll('#faders .strip').forEach(function (strip, idx) {
      var id = LS.TRACK_IDS[idx];
      var pan = strip.querySelector('.pan');
      if (!pan || !id) return;
      pan.value = String(S.tracks[id].pan || 0);
      pan.style.setProperty('--fill', ((S.tracks[id].pan || 0) + 100) / 2 + '%');
    });
    document.querySelectorAll('[data-mute],[data-solo]').forEach(function (b) {
      var id = b.dataset.mute || b.dataset.solo;
      var on = b.dataset.mute ? S.tracks[id].mute : S.tracks[id].solo;
      b.classList.toggle('on', !!on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function paintNowPlaying() {
    var S = LS.State.data;
    var pattern = S.patternId ? LS.PATTERNS[S.patternId].name : 'Custom';
    if (el.npPattern) el.npPattern.textContent = pattern;
    if (el.npVibe) el.npVibe.textContent = LS.VIBES[S.vibe].name;
    if (el.bpmNum) el.bpmNum.textContent = S.bpm;
  }

  function paintTransport(playing) {
    if (!el.play) return;
    el.play.classList.toggle('playing', playing);
    el.play.setAttribute('aria-label', playing ? 'Stop' : 'Play');
    el.play.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';
    document.body.classList.toggle('is-playing', playing);
  }

  function paintSettings() {
    var S = LS.State.data;
    [['setAutosave', 'autoSave'], ['setAutofill', 'autoFill'], ['setDebug', 'debug'],
     ['setMetro', 'metro'], ['setCountIn', 'countIn']].forEach(function (pair) {
      var b = el[pair[0]];
      if (!b) return;
      b.setAttribute('aria-checked', S[pair[1]] ? 'true' : 'false');
      b.classList.toggle('on', !!S[pair[1]]);
    });
    if (el.vizMode) el.vizMode.textContent = S.viz === 'wave' ? 'Waveform' : 'Spectrum';
    if (el.storage) {
      el.storage.textContent = (LS.State.bytes() / 1024).toFixed(1) + ' KB saved on this device';
    }
  }

  function paintAll() {
    paintSequencer();
    paintPatterns();
    paintVibes();
    paintPresets();
    paintThemes();
    paintTracks();
    paintAmbience();
    paintNowPlaying();
    paintSettings();
  }

  /* ------------------------------------------------------------- highlight */
  function highlight(step) {
    if (lastStep === step) return;
    if (lastStep >= 0) {
      for (var t = 0; t < pads[lastStep].length; t++) pads[lastStep][t].classList.remove('is-playing');
    }
    for (var k = 0; k < pads[step].length; k++) pads[step][k].classList.add('is-playing');
    lastStep = step;
    if (el.readout) el.readout.textContent = (Math.floor(step / 4) + 1) + '·' + (step % 4 + 1);
  }
  function clearHighlight() {
    if (lastStep < 0) return;
    for (var t = 0; t < pads[lastStep].length; t++) pads[lastStep][t].classList.remove('is-playing');
    lastStep = -1;
  }

  /* ------------------------------------------------------------------ view */
  function setView(name) {
    document.querySelectorAll('.navbtn[data-view]').forEach(function (b) {
      var on = b.dataset.view === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-current', on ? 'page' : 'false');
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.hidden = v.id !== 'view-' + name;
    });
    document.body.dataset.section = name;
    if (name !== 'studio') LS.Viz.stop(); else LS.Viz.start();
  }

  /* ------------------------------------------------------------ visualiser */
  var Viz = (function () {
    var raf = null, ctx = null, grad = null, paused = false, last = 0;
    function resize() {
      var c = el.viz;
      if (!c) return;
      var r = c.getBoundingClientRect();
      if (!r.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      ctx = c.getContext('2d');
      var cs = getComputedStyle(document.body);
      grad = ctx.createLinearGradient(0, 0, c.width, 0);
      grad.addColorStop(0, cs.getPropertyValue('--acc2').trim() || '#533483');
      grad.addColorStop(1, cs.getPropertyValue('--acc').trim() || '#e94560');
    }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (paused || !ctx) return;
      if (now - last < 33) return;
      last = now;
      var c = el.viz;
      ctx.clearRect(0, 0, c.width, c.height);
      var an = LS.Audio.analyser;
      if (!an) return;
      var data;
      try { data = an.getValue(); } catch (e) { return; }
      ctx.strokeStyle = grad; ctx.fillStyle = grad;
      ctx.lineWidth = Math.max(1.2, (window.devicePixelRatio || 1) * 1.4);
      if (LS.State.data.viz === 'wave') {
        ctx.beginPath();
        var w = c.width, h = c.height;
        for (var i = 0; i < data.length; i++) {
          var y = ((data[i] + 1) / 2) * h;
          if (i === 0) ctx.moveTo(0, y); else ctx.lineTo(i * (w / data.length), y);
        }
        ctx.stroke();
      } else {
        var bw = c.width / data.length;
        for (var j = 0; j < data.length; j++) {
          var norm = Math.max(0, Math.min(1, (data[j] + 120) / 120));
          var bh = norm * c.height;
          ctx.fillRect(j * bw, c.height - bh, Math.max(1, bw * 0.72), bh);
        }
      }
    }
    return {
      init: function () { resize(); },
      start: function () {
        if (!el.viz) return;
        resize();
        if (!raf) raf = requestAnimationFrame(frame);
      },
      stop: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } },
      resize: resize,
      pause: function (p) { paused = p; }
    };
  })();

  LS.Viz = Viz;

  LS.UI = {
    init: function () {
      el = {
        toasts: $('toasts'),
        presets: $('presets'),
        patterns: $('patterns'),
        vibes: $('vibes'),
        seq: $('seq'),
        viz: $('viz'),
        faders: $('faders'),
        knobs: $('fx-knobs'),
        amb: $('amb-grid'),
        themes: $('themes-grid'),
        play: $('btn-play'),
        bpmNum: $('bpm-num'),
        npPattern: $('np-pattern'),
        npVibe: $('np-vibe'),
        readout: $('readout'),
        setAutosave: $('set-autosave'),
        setAutofill: $('set-autofill'),
        setDebug: $('set-debug'),
        setMetro: $('set-metro'),
        setCountIn: $('set-countin'),
        vizMode: $('set-viz'),
        storage: $('storage-info')
      };
      buildPresets();
      buildPatterns();
      buildVibes();
      buildSequencer();
      bindPaintGestures();
      buildMixer();
      buildFx();
      buildAmbience();
      buildThemes();
      paintAll();
      renderPresets();
    },
    toast: toast,
    highlight: highlight,
    clearHighlight: clearHighlight,
    setView: setView,
    paintAll: paintAll,
    paintSequencer: paintSequencer,
    paintPatterns: paintPatterns,
    paintVibes: paintVibes,
    paintPresets: paintPresets,
    paintThemes: paintThemes,
    paintTracks: paintTracks,
    paintNowPlaying: paintNowPlaying,
    paintTransport: paintTransport,
    paintSettings: paintSettings,
    renderPresets: renderPresets,
    paintAmbience: paintAmbience,
    makeKnob: knob,
    knob: function (id) { return knobs[id]; },
    el: function (id) { return $(id); }
  };
})(window.LS = window.LS || {});
