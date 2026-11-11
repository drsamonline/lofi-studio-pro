/* =============================================================================
   Lofi Studio Pro — state.js
   Single source of truth, validation, persistence and migration.
   Every value that reaches the audio engine has already been type- and
   range-checked here, so the engine never has to defend itself.
   ========================================================================== */
(function (LS) {
  'use strict';

  var KEY = 'lofi-studio-v2';
  var LEGACY_KEY = 'lofi-studio-v7';
  var SAVE_MS = 400;

  function num(v, min, max, fallback) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    if (!isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }
  function bool(v, fallback) { return typeof v === 'boolean' ? v : fallback; }
  function oneOf(list, v, fallback) { return list.indexOf(v) > -1 ? v : fallback; }
  function obj(v) { return (v && typeof v === 'object') ? v : {}; }

  function defaults() {
    var steps = {}, tracks = {}, amb = {};
    LS.TRACK_IDS.forEach(function (t) { steps[t] = LS.PATTERNS.chillhop.steps[t].slice(); });
    LS.TRACK_IDS.forEach(function (t) { tracks[t] = { vol: 80, mute: false, solo: false }; });
    LS.AMBIENCE_IDS.forEach(function (a) { amb[a] = { on: false, vol: 50 }; });
    return {
      v: 2,
      bpm: 80,
      swing: 10,
      master: 80,
      patternId: 'chillhop',
      steps: steps,
      tracks: tracks,
      vibe: 'jazz',
      preset: null,
      fx: { filter: 8000, tape: 15, crackle: 10, reverb: 30, chorus: 15, wow: 10 },
      amb: amb,
      theme: 'purple',
      viz: 'wave',
      autoFill: false,
      autoSave: true,
      debug: false,
      sleep: 0
    };
  }

  /* Merge an untrusted object onto defaults, one known key at a time.
     Anything missing, misspelled or out of range falls back to the default,
     which is what makes an old or half-written save harmless. */
  function merge(src) {
    var d = defaults(), s = obj(src);

    d.bpm = Math.round(num(s.bpm, 60, 160, d.bpm));
    d.swing = Math.round(num(s.swing, 0, 60, d.swing));
    d.master = Math.round(num(s.master, 0, 100, d.master));
    d.patternId = s.patternId === null ? null : oneOf(LS.PATTERN_ORDER, s.patternId, d.patternId);
    d.vibe = oneOf(LS.VIBE_ORDER, s.vibe, d.vibe);
    d.preset = oneOf(LS.PRESET_ORDER, s.preset, null);
    d.theme = oneOf(LS.THEME_IDS, s.theme, d.theme);
    d.viz = oneOf(['wave', 'bars'], s.viz, d.viz);
    d.autoFill = bool(s.autoFill, d.autoFill);
    d.autoSave = bool(s.autoSave, d.autoSave);
    d.debug = bool(s.debug, d.debug);
    d.sleep = [0, 15, 30, 60, 90].indexOf(s.sleep) > -1 ? s.sleep : 0;

    var fx = obj(s.fx);
    d.fx.filter = Math.round(num(fx.filter, 400, 12000, d.fx.filter));
    d.fx.tape = Math.round(num(fx.tape, 0, 100, d.fx.tape));
    d.fx.crackle = Math.round(num(fx.crackle, 0, 100, d.fx.crackle));
    d.fx.reverb = Math.round(num(fx.reverb, 0, 100, d.fx.reverb));
    d.fx.chorus = Math.round(num(fx.chorus, 0, 100, d.fx.chorus));
    d.fx.wow = Math.round(num(fx.wow, 0, 100, d.fx.wow));

    var st = obj(s.steps);
    LS.TRACK_IDS.forEach(function (t) {
      var row = st[t];
      if (Array.isArray(row) && row.length === LS.STEP_COUNT) {
        d.steps[t] = row.map(function (x) {
          var n = parseInt(x, 10);
          if (!isFinite(n)) return 0;
          return Math.min(3, Math.max(0, n));
        });
      }
    });

    var tr = obj(s.tracks);
    LS.TRACK_IDS.forEach(function (t) {
      var r = obj(tr[t]);
      d.tracks[t].vol = Math.round(num(r.vol, 0, 100, d.tracks[t].vol));
      d.tracks[t].mute = bool(r.mute, false);
      d.tracks[t].solo = bool(r.solo, false);
    });

    var am = obj(s.amb);
    LS.AMBIENCE_IDS.forEach(function (a) {
      var r = obj(am[a]);
      d.amb[a].on = bool(r.on, false);
      d.amb[a].vol = Math.round(num(r.vol, 0, 100, d.amb[a].vol));
    });

    return d;
  }

  /* One-shot migration from the v7 single-file build, so nobody loses a
     pattern they were working on. Runs once, then the old key is dropped. */
  function migrateLegacy() {
    var raw;
    try { raw = localStorage.getItem(LEGACY_KEY); } catch (e) { return null; }
    if (!raw) return null;
    var old;
    try { old = JSON.parse(raw); } catch (e) { return null; }
    if (!old || typeof old !== 'object') return null;

    var converted = {
      bpm: old.bpm,
      swing: old.swing,
      patternId: old.activePatternId,
      steps: old.customSteps,
      tracks: {},
      vibe: old.vibe,
      preset: old.activeProfile,
      fx: {
        filter: old.fx && old.fx.filter,
        tape: old.fx && old.fx.tape,
        crackle: old.fx && old.fx.crackle,
        reverb: old.fx && old.fx.reverb,
        chorus: old.fx && old.fx.chorus,
        wow: old.fx && old.fx.tremolo
      },
      amb: {},
      theme: old.theme,
      viz: old.vizMode === 'frequency' ? 'bars' : 'wave',
      autoFill: old.autoFill
    };
    Object.keys(old.trackSettings || {}).forEach(function (t) {
      var r = old.trackSettings[t];
      converted.tracks[t] = { vol: r.volume, mute: r.mute, solo: r.solo };
    });
    Object.keys(old.ambience || {}).forEach(function (a) {
      converted.amb[a] = { on: old.ambience[a].on, vol: old.ambience[a].volume };
    });
    return converted;
  }

  var State = {
    data: defaults(),
    listeners: [],

    load: function () {
      var raw = null;
      try { raw = localStorage.getItem(KEY); } catch (e) { /* private mode */ }

      if (!raw) {
        var legacy = migrateLegacy();
        if (legacy) {
          State.data = merge(legacy);
          try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
          State.save();
          return { migrated: true };
        }
        State.data = defaults();
        return { migrated: false };
      }

      try {
        State.data = merge(JSON.parse(raw));
      } catch (e) {
        console.warn('[Lofi] Saved state unreadable, starting fresh', e);
        State.data = defaults();
      }
      return { migrated: false };
    },

    save: function () {
      if (!State.data.autoSave) return false;
      try {
        localStorage.setItem(KEY, JSON.stringify(State.data));
        return true;
      } catch (e) {
        console.warn('[Lofi] Could not persist state', e);
        return false;
      }
    },

    bytes: function () {
      try { return (localStorage.getItem(KEY) || '').length; } catch (e) { return 0; }
    },

    clear: function () {
      try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); } catch (e) {}
    },

    reset: function () {
      State.data = defaults();
      State.clear();
      State.save();
      return State.data;
    },

    /* Coalesce bursts of slider input into one write. */
    saveSoon: (function () {
      var t = null;
      return function () {
        clearTimeout(t);
        t = setTimeout(State.save, SAVE_MS);
      };
    })(),

    onChange: function (fn) { State.listeners.push(fn); },
    emit: function (what) {
      State.listeners.forEach(function (fn) { try { fn(what); } catch (e) { console.warn(e); } });
    },

    /* ---------------------------------------------------------- sharing
       A pattern is 6 tracks x 16 steps of 2 bits = 48 hex characters, so a
       whole beat fits comfortably in a URL. */
    encode: function () {
      var d = State.data;
      var out = '';
      LS.TRACK_IDS.forEach(function (t) {
        var bits = 0;
        for (var i = 0; i < LS.STEP_COUNT; i++) bits = (bits << 2) | (d.steps[t][i] & 3);
        out += ('0000000' + (bits >>> 0).toString(16)).slice(-8);
      });
      return out;
    },

    decode: function (hex) {
      if (!hex || hex.length < 48 || /[^0-9a-f]/i.test(hex)) return null;
      var steps = {};
      for (var t = 0; t < LS.TRACK_IDS.length; t++) {
        var chunk = hex.substr(t * 8, 8);
        var bits = parseInt(chunk, 16) >>> 0;
        var row = [];
        for (var i = LS.STEP_COUNT - 1; i >= 0; i--) { row[i] = (bits >>> ((LS.STEP_COUNT - 1 - i) * 2)) & 3; }
        steps[LS.TRACK_IDS[t]] = row;
      }
      return steps;
    },

    /* Narrow accessors used by the UI and the audio engine. */
    track: function (id) { return State.data.tracks[id]; },
    step: function (id, i) { return State.data.steps[id][i]; },
    fx: function (k) { return State.data.fx[k]; }
  };

  LS.State = State;
  LS.defaults = defaults;
})(window.LS = window.LS || {});
