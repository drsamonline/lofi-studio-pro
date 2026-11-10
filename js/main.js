/* =============================================================================
   Lofi Studio Pro — main.js
   The controller: boot order, transport, presets, recording, PWA plumbing.
   Transport changes are guarded by a promise, not a timer — a timer lock is
   what made "Surprise Me" swallow its own restart in the previous build.
   ========================================================================== */
(function (LS) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var S = LS.State;
  var A = LS.Audio;
  var UI = LS.UI;

  var playing = false;
  var busy = false;
  var tapTimes = [];
  var recording = false;
  var recTimer = null;
  var swingCtl = null;

  /* ------------------------------------------------------------- transport */
  function setPlaying(v) {
    playing = v;
    UI.paintTransport(v);
  }

  async function play() {
    if (busy || playing) return;
    busy = true;
    try {
      await A.ensure();
      A.scheduleSequence();
      A.startTransport();
      setPlaying(true);
    } catch (e) {
      UI.toast('Audio could not start — tap the screen and try again', 'error');
      console.error(e);
    } finally {
      busy = false;
    }
  }

  function stop() {
    if (busy) return;
    A.clearSequence();
    UI.clearHighlight();
    setPlaying(false);
    /* Ambience layers are driven by the transport, so it keeps running while
       any of them is on; stopping it would silence the rain too. */
    if (A.ambienceCount() === 0) A.stopTransport();
  }

  function toggle() { return playing ? stop() : play(); }

  function panic() {
    A.panic();
    setPlaying(false);
    UI.clearHighlight();
    UI.paintAmbience();
    UI.toast('All audio stopped', 'warn');
  }

  /* --------------------------------------------------------------- controls */
  function setBpm(v, quiet) {
    var bpm = Math.round(Math.min(160, Math.max(60, v)));
    S.data.bpm = bpm;
    A.setBpm(bpm);
    UI.paintNowPlaying();
    if (!quiet) S.saveSoon();
    return bpm;
  }

  function nudgeBpm(delta) { setBpm(S.data.bpm + delta); }

  function tapTempo() {
    var now = performance.now();
    if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
    tapTimes.push(now);
    if (tapTimes.length > 5) tapTimes.shift();
    if (tapTimes.length < 2) { UI.toast('Keep tapping…', 'info'); return; }
    var total = tapTimes[tapTimes.length - 1] - tapTimes[0];
    var avg = total / (tapTimes.length - 1);
    var bpm = Math.round(60000 / avg);
    if (bpm < 60 || bpm > 160) { UI.toast('Tap between 60 and 160 BPM', 'warn'); return; }
    setBpm(bpm);
    UI.toast(bpm + ' BPM', 'success');
  }

  /* ---------------------------------------------------------------- presets */
  function applyPreset(id, autoplay) {
    var p = LS.PRESETS[id];
    if (!p) return;
    S.data.preset = id;
    setBpm(p.bpm);
    S.data.swing = p.swing;
    S.data.fx.filter = p.filter;
    S.data.fx.reverb = p.reverb;
    S.data.fx.crackle = p.crackle;
    S.data.fx.tape = p.tape;
    loadPattern(p.pattern, true);
    setVibe(p.vibe, true);

    A.setFilter(p.filter);
    A.setReverb(p.reverb);
    A.setCrackle(p.crackle);
    A.setTape(p.tape);

    var k = UI.knob('filter'); if (k) k.set(p.filter);
    k = UI.knob('reverb'); if (k) k.set(p.reverb);
    k = UI.knob('crackle'); if (k) k.set(p.crackle);
    k = UI.knob('tape'); if (k) k.set(p.tape);
    if (swingCtl) swingCtl.set(p.swing);

    UI.paintPresets();
    UI.paintNowPlaying();
    S.save();
    UI.toast(p.name + ' profile', 'success');
    if (autoplay !== false && !playing) play();
  }

  function loadPattern(id, quiet) {
    var p = LS.PATTERNS[id];
    if (!p) return;
    LS.TRACK_IDS.forEach(function (t) { S.data.steps[t] = p.steps[t].slice(); });
    S.data.patternId = id;
    UI.paintSequencer();
    UI.paintPatterns();
    UI.paintNowPlaying();
    if (!quiet) { S.saveSoon(); UI.toast(p.name, 'info'); }
  }

  function setVibe(id, quiet) {
    if (!LS.VIBES[id]) return;
    S.data.vibe = id;
    UI.paintVibes();
    UI.paintNowPlaying();
    if (!quiet) { S.saveSoon(); UI.toast(LS.VIBES[id].name + ' chords', 'info'); }
  }

  function applyTheme(id) {
    if (LS.THEME_IDS.indexOf(id) < 0) return;
    S.data.theme = id;
    document.body.dataset.theme = id;
    var meta = document.querySelector('meta[name="theme-color"]');
    var t = LS.THEMES.filter(function (x) { return x.id === id; })[0];
    if (meta && t) meta.setAttribute('content', t.bg);
    UI.paintThemes();
    LS.Viz.resize();
    S.saveSoon();
  }

  async function toggleAmbience(id) {
    var st = S.data.amb[id];
    var next = !st.on;
    if (next) {
      try {
        await A.ensure();
      } catch (e) {
        UI.toast('Audio could not start', 'error');
        return false;
      }
      st.on = true;
      A.ambienceOn(id);
      if (!playing) A.startTransport();
      UI.toast(LS.AMBIENCE.filter(function (a) { return a.id === id; })[0].name + ' on', 'success');
    } else {
      st.on = false;
      A.ambienceOff(id);
      if (!playing && A.ambienceCount() === 0) A.stopTransport();
      UI.toast(LS.AMBIENCE.filter(function (a) { return a.id === id; })[0].name + ' off', 'info');
    }
    UI.paintAmbience();
    S.saveSoon();
    return true;
  }

  /* --------------------------------------------------------------- surprise */
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function surprise() {
    /* Everything below is read live at trigger time, so a new pattern, chord
       set or tempo takes effect on the next step — no restart, no gap. */
    S.data.preset = null;
    loadPattern(pick(LS.PATTERN_ORDER), true);
    setVibe(pick(LS.VIBE_ORDER), true);
    applyTheme(pick(LS.THEME_IDS));
    setBpm(60 + Math.floor(Math.random() * 61));
    S.data.swing = Math.floor(Math.random() * 26);
    if (swingCtl) swingCtl.set(S.data.swing);
    UI.paintPresets();
    UI.paintNowPlaying();
    S.save();
    UI.toast('Surprise — ' + LS.PATTERNS[S.data.patternId].name + ' / ' + LS.VIBES[S.data.vibe].name, 'success');
    if (!playing) play();
  }

  /* --------------------------------------------------------------- recording */
  async function toggleRecord() {
    if (!recording) {
      try {
        await A.ensure();
        if (!A.canRecord()) { UI.toast('Recording is not supported in this browser', 'error'); return; }
        if (!playing) await play();
        await A.recordStart();
      } catch (e) {
        UI.toast('Could not start recording', 'error');
        console.error(e);
        return;
      }
      recording = true;
      var btn = $('btn-record');
      btn.classList.add('recording');
      btn.setAttribute('aria-pressed', 'true');
      var t0 = Date.now();
      recTimer = setInterval(function () {
        var s = Math.floor((Date.now() - t0) / 1000);
        $('rec-time').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      }, 500);
      UI.toast('Recording — press stop to save', 'info');
      return;
    }

    recording = false;
    clearInterval(recTimer);
    var b = $('btn-record');
    b.classList.remove('recording');
    b.setAttribute('aria-pressed', 'false');
    $('rec-time').textContent = '';
    try {
      var blob = await A.recordStop();
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      a.href = url;
      a.download = 'lofi-studio-' + stamp + (blob.type.indexOf('mp4') > -1 ? '.m4a' : '.webm');
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      UI.toast('Take saved', 'success');
    } catch (e) {
      UI.toast('Recording failed', 'error');
      console.error(e);
    }
  }

  /* ------------------------------------------------------------------ reset */
  function reset() {
    stop();
    Object.keys(S.data.amb).forEach(function (id) { A.ambienceOff(id); });
    S.reset();
    A.applyAll();
    A.setBpm(S.data.bpm);
    applyTheme(S.data.theme);
    UI.paintAll();
    UI.paintTransport(false);
    if (swingCtl) swingCtl.set(S.data.swing);
    var mk = UI.knob('filter'); if (mk) mk.set(S.data.fx.filter);
    UI.toast('Back to defaults', 'success');
  }

  /* ------------------------------------------------------------------- boot */
  function wire() {
    $('btn-play').addEventListener('click', toggle);
    $('btn-panic').addEventListener('click', panic);
    $('btn-record').addEventListener('click', toggleRecord);
    $('btn-bpm-down').addEventListener('click', function () { nudgeBpm(-1); });
    $('btn-bpm-up').addEventListener('click', function () { nudgeBpm(1); });
    $('btn-tap').addEventListener('click', tapTempo);
    $('btn-surprise').addEventListener('click', surprise);
    $('btn-reset').addEventListener('click', function () {
      if (confirm('Reset every setting, pattern and volume to the defaults?')) reset();
    });
    $('btn-fill').addEventListener('click', function () {
      S.data.autoFill = !S.data.autoFill;
      this.classList.toggle('on', S.data.autoFill);
      this.setAttribute('aria-pressed', S.data.autoFill ? 'true' : 'false');
      S.saveSoon();
    });
    $('set-autosave').addEventListener('click', function () {
      S.data.autoSave = !S.data.autoSave;
      UI.paintSettings();
      if (S.data.autoSave) S.save();
      UI.toast(S.data.autoSave ? 'Auto-save on' : 'Auto-save off — changes will not persist', S.data.autoSave ? 'success' : 'warn');
    });
    $('set-autofill').addEventListener('click', function () {
      S.data.autoFill = !S.data.autoFill;
      UI.paintSettings();
      $('btn-fill').classList.toggle('on', S.data.autoFill);
      S.saveSoon();
    });
    $('set-debug').addEventListener('click', function () {
      S.data.debug = !S.data.debug;
      UI.paintSettings();
      S.saveSoon();
    });
    $('set-viz').addEventListener('click', function () {
      S.data.viz = S.data.viz === 'wave' ? 'bars' : 'wave';
      A.setViz(S.data.viz);
      UI.paintSettings();
      S.saveSoon();
    });

    document.querySelectorAll('.navbtn[data-view]').forEach(function (b) {
      b.addEventListener('click', function () { UI.setView(b.dataset.view); });
    });

    /* Mute / solo exist twice: in the sequencer heads and in the mixer. */
    document.addEventListener('click', function (e) {
      var m = e.target.closest('[data-mute]');
      var s = e.target.closest('[data-solo]');
      if (m) {
        var id = m.dataset.mute;
        S.data.tracks[id].mute = !S.data.tracks[id].mute;
        A.setTrackMute(id, S.data.tracks[id].mute);
        UI.paintTracks();
        S.saveSoon();
      } else if (s) {
        var sid = s.dataset.solo;
        S.data.tracks[sid].solo = !S.data.tracks[sid].solo;
        A.setTrackSolo(sid, S.data.tracks[sid].solo);
        UI.paintTracks();
        S.saveSoon();
      }
    });

    var volKnob = $('vol-knob');
    UI.makeKnob(volKnob, {
      label: 'Master volume', min: 0, max: 100, size: 44,
      def: 80,
      get: function () { return S.data.master; },
      onChange: function (v) {
        S.data.master = v;
        A.setMaster(v);
        S.saveSoon();
      }
    });

    var swingKnob = $('swing-knob');
    swingCtl = UI.makeKnob(swingKnob, {
      label: 'Swing amount', min: 0, max: 60, size: 44,
      def: 10,
      format: function (v) { return v + '%'; },
      get: function () { return S.data.swing; },
      onChange: function (v) { S.data.swing = v; S.saveSoon(); }
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey) return;
      if (e.target.getAttribute && e.target.getAttribute('role') === 'slider') return;
      var k = e.key.toLowerCase();
      if (k === ' ') { e.preventDefault(); toggle(); }
      else if (k === 's') { surprise(); }
      else if (k === 'x') { panic(); }
      else if (k === 'r') { toggleRecord(); }
      else if (k === 'b') {
        var idx = LS.THEME_IDS.indexOf(S.data.theme);
        applyTheme(LS.THEME_IDS[(idx + 1) % LS.THEME_IDS.length]);
      }
    });

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { LS.Viz.resize(); }, 150);
    });
    document.addEventListener('visibilitychange', function () {
      LS.Viz.pause(document.hidden);
    });
  }

  function setupPwa() {
    var install = $('btn-install');
    var deferred = null;
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferred = e;
      install.hidden = false;
    });
    install.addEventListener('click', async function () {
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      install.hidden = true;
    });
    window.addEventListener('appinstalled', function () {
      install.hidden = true;
      UI.toast('Installed — find it on your home screen', 'success');
    });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
          console.warn('[Lofi] Service worker not registered', err);
        });
      });
    }
  }

  function boot() {
    var loaded = S.load();
    document.body.dataset.theme = S.data.theme;

    UI.init();
    wire();
    setupPwa();

    applyTheme(S.data.theme);
    A.setBpm(S.data.bpm);
    A.setViz(S.data.viz);
    UI.paintAll();
    UI.setView('studio');

    var meta = document.querySelector('meta[name="theme-color"]');
    var t = LS.THEMES.filter(function (x) { return x.id === S.data.theme; })[0];
    if (meta && t) meta.setAttribute('content', t.bg);

    var loader = $('loader');
    if (loader) { loader.classList.add('gone'); setTimeout(function () { loader.remove(); }, 400); }

    /* Manifest shortcuts land here: ?preset=focus sets the scene without
       starting audio, because a page load is not a user gesture. */
    var deep = /[?&]preset=([a-z]+)/.exec(location.search);
    if (deep && LS.PRESETS[deep[1]]) {
      applyPreset(deep[1], false);
      UI.toast('Loaded the ' + LS.PRESETS[deep[1]].name + ' preset — press play', 'info');
    }

    if (loaded.migrated) {
      UI.toast('Your old pattern was carried over', 'success');
    }
    if (typeof Tone === 'undefined') {
      UI.toast('Audio engine missing — check vendor/tone.min.js', 'error');
    }
    console.log('[Lofi] ready · ' + LS.TRACK_IDS.length + ' tracks · ' + LS.PATTERN_ORDER.length + ' patterns');
  }

  /* Public surface used by ui.js and by the test harness. */
  LS.App = {
    play: play, stop: stop, toggle: toggle, panic: panic,
    setBpm: setBpm, nudgeBpm: nudgeBpm, tapTempo: tapTempo,
    applyPreset: applyPreset, loadPattern: loadPattern, setVibe: setVibe,
    applyTheme: applyTheme, toggleAmbience: toggleAmbience,
    surprise: surprise, reset: reset, record: toggleRecord,
    isPlaying: function () { return playing; },
    isRecording: function () { return recording; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.LS = window.LS || {});
