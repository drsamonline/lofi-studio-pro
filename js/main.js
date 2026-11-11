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
    if (v && S.data.song.on) UI.paintSong();
    if (v) { keepAwake(); mediaSession('playing'); }
    else { releaseAwake(); mediaSession('paused'); }
  }

  /* ---------------------------------------------------------- keep awake
     A phone that sleeps mid-beat is the most annoying thing about using this
     on a phone. The lock is released by the browser when the tab is hidden,
     so it is re-requested on the way back. */
  var wakeLock = null;
  async function keepAwake() {
    try {
      if (!('wakeLock' in navigator) || wakeLock) return;
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', function () { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }
  function releaseAwake() {
    if (!wakeLock) return;
    try { wakeLock.release(); } catch (e) {}
    wakeLock = null;
  }

  /* -------------------------------------------------------- media session
     Play/pause and a title on the lock screen and on headphone buttons. */
  function mediaSession(state) {
    if (!('mediaSession' in navigator)) return;
    try {
      if (state === 'playing') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: LS.PATTERNS[S.data.patternId || 'chillhop'] ? (S.data.patternId ? LS.PATTERNS[S.data.patternId].name : 'Custom') : 'Lofi Studio',
          artist: LS.VIBES[S.data.vibe].name + ' · ' + S.data.bpm + ' BPM',
          album: 'Lofi Studio Pro',
          artwork: [
            { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';
      } else {
        navigator.mediaSession.playbackState = 'paused';
      }
    } catch (e) {}
  }

  async function play() {
    if (busy || playing) return;
    busy = true;
    try {
      await A.ensure();
      A.scheduleSequence(!!S.data.countIn);
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
    if (A.ambienceCount() === 0) A.fadeOut(function () { A.stopTransport(); });
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

  /* ---------------------------------------------------------------- song */
  function enterSlot(i, first) {
    var slot = S.loadSlot(i);
    if (!slot) return;
    if (!first) {
      UI.paintSequencer();
      UI.paintVibes();
      UI.paintNowPlaying();
    }
    UI.paintSong();
  }

  function toggleSong() {
    S.data.song.on = !S.data.song.on;
    var filled = S.data.song.slots.filter(Boolean).length;
    if (S.data.song.on && !filled) {
      S.data.song.on = false;
      UI.toast('Capture a pattern into a slot first', 'warn');
    } else if (S.data.song.on) {
      UI.toast('Song mode — ' + filled + ' slot' + (filled > 1 ? 's' : '') + ', 2 bars each', 'success');
    } else {
      UI.toast('Loop mode', 'info');
    }
    UI.paintSong();
    S.saveSoon();
  }

  /* One delegated handler: the slot buttons are rebuilt on every repaint, so
     binding to the elements themselves would silently die after the first
     capture. */
  function bindSongSlots() {
    var host = document.getElementById('song-slots');
    if (!host) return;
    var timer = null, held = false, index = -1;

    function slotOf(e) {
      var el = e.target.closest ? e.target.closest('[data-slot]') : null;
      return el ? parseInt(el.dataset.slot, 10) : -1;
    }

    host.addEventListener('pointerdown', function (e) {
      index = slotOf(e);
      if (index < 0) return;
      held = false;
      timer = setTimeout(function () {
        held = true;
        if (!S.data.song.slots[index]) return;
        S.clearSlot(index);
        UI.paintSong();
        S.save();
        UI.toast('Slot ' + String.fromCharCode(65 + index) + ' cleared', 'info');
      }, 600);
    });
    host.addEventListener('pointerup', function () { clearTimeout(timer); });
    host.addEventListener('pointerleave', function () { clearTimeout(timer); });

    host.addEventListener('click', function (e) {
      var i = slotOf(e);
      if (i < 0) return;
      if (held) { held = false; return; }
      if (S.data.song.slots[i]) {
        S.loadSlot(i);
        UI.paintSequencer();
        UI.paintVibes();
        UI.paintNowPlaying();
        UI.toast('Loaded slot ' + String.fromCharCode(65 + i), 'info');
      } else {
        S.captureSlot(i);
        UI.paintSong();
        UI.toast('Captured into slot ' + String.fromCharCode(65 + i), 'success');
      }
      S.save();
    });
  }

  /* ------------------------------------------------------------- undo / redo */
  function undo() {
    if (!S.undo()) { UI.toast('Nothing to undo', 'info'); return; }
    applySnapshot();
    UI.toast('Undone', 'info');
  }
  function redo() {
    if (!S.redo()) return;
    applySnapshot();
    UI.toast('Redone', 'info');
  }

  /* A 8 ms tick on a pad press. iOS has no vibration API; everything else does. */
  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 8); } catch (e) {}
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

  /* --------------------------------------------------------- my presets
     A snapshot of the beat and its sound, stored beside the live state.
     Loading one never touches preferences — only the musical half. */
  function savePreset() {
    var input = $('preset-name');
    var entry = S.savePreset(input ? input.value : '');
    if (input) input.value = '';
    UI.renderPresets();
    UI.toast('Saved "' + entry.name + '"', 'success');
  }

  /* Bring the running layers in line with the state, in both directions —
     a loaded preset may want rain on and fire off. */
  function syncAmbience() {
    LS.AMBIENCE_IDS.forEach(function (id) {
      var want = S.data.amb[id].on;
      var running = A.isAmbienceOn(id);
      if (want && !running) A.ambienceOn(id);
      else if (!want && running) A.ambienceOff(id);
      else if (want && running) A.ambienceVol(id, S.data.amb[id].vol);
    });
  }

  function applySnapshot() {
    A.applyAll();
    A.setBpm(S.data.bpm);
    applyTheme(S.data.theme);
    UI.paintAll();
    UI.paintTransport(playing);
    if (UI.knob('filter')) UI.knob('filter').set(S.data.fx.filter);
    if (swingCtl) swingCtl.set(S.data.swing);
    syncAmbience();
  }

  function loadPreset(id) {
    var hit = S.loadPreset(id);
    if (!hit) return;
    applySnapshot();
    UI.toast('Loaded "' + hit.name + '"', 'success');
  }

  function deletePreset(id) {
    S.deletePreset(id);
    UI.renderPresets();
    UI.toast('Preset deleted', 'info');
  }

  /* --------------------------------------------------------- export / import */
  function exportFile() {
    var payload = S.exportState();
    var name = (S.data.patternId ? LS.PATTERNS[S.data.patternId].name : 'custom')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-');
    var stamp = new Date().toISOString().slice(0, 10);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lofi-' + name + '-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    UI.toast('Beat downloaded', 'success');
  }

  function exportMidi() {
    try {
      var bytes = LS.MIDI.build(S.data);
      var name = (S.data.patternId ? LS.PATTERNS[S.data.patternId].name : 'custom')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var blob = new Blob([bytes], { type: 'audio/midi' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'lofi-' + name + '-' + S.data.bpm + 'bpm.mid';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      UI.toast('Four bars exported as MIDI', 'success');
    } catch (e) {
      UI.toast('Could not build the MIDI file', 'error');
      console.error(e);
    }
  }

  function clearPattern() {
    var empty = new Array(LS.STEP_COUNT).fill(0);
    var any = LS.TRACK_IDS.some(function (t) {
      return S.data.steps[t].some(function (v) { return v; });
    });
    if (!any) { UI.toast('Already empty', 'info'); return; }
    LS.TRACK_IDS.forEach(function (t) { S.data.steps[t] = empty.slice(); });
    S.data.patternId = null;
    UI.paintSequencer();
    UI.paintPatterns();
    UI.paintNowPlaying();
    S.save();
    UI.toast('Pattern cleared — Ctrl+Z to undo', 'info');
  }

  /* ---------------------------------------------------------------- MIDI in
     A keyboard or pad controller plays the voices. Note numbers follow the
     General MIDI drum map, so any controller works without configuration. */
  var MIDI_MAP = { 36: 'kick', 35: 'kick', 38: 'snare', 40: 'snare', 39: 'snare',
                   42: 'hat', 44: 'hat', 46: 'hat', 48: 'bass',
                   60: 'keys', 62: 'keys', 64: 'keys', 72: 'melody', 74: 'melody', 76: 'melody' };
  var midiAccess = null;

  function handleMidi(data) {
    if (!data || data.length < 3) return;
    var cmd = data[0] & 0xf0;
    if (cmd !== 0x90 || data[2] === 0) return;
    var id = MIDI_MAP[data[1]];
    if (!id) return;
    A.audition(id);
    UI.flashTrack(id);
    haptic(6);
  }

  async function toggleMidi() {
    if (midiAccess) {
      if (midiAccess.inputs) {
        midiAccess.inputs.forEach(function (input) { input.onmidimessage = null; });
      }
      midiAccess = null;
      S.data.midi = false;
      UI.paintSettings();
      S.saveSoon();
      UI.toast('MIDI input off', 'info');
      return;
    }
    if (!navigator.requestMIDIAccess) { UI.toast('This browser has no Web MIDI', 'warn'); return; }
    try {
      midiAccess = await navigator.requestMIDIAccess();
      var count = 0;
      midiAccess.inputs.forEach(function (input) {
        input.onmidimessage = function (e) { handleMidi(e.data); };
        count++;
      });
      S.data.midi = true;
      UI.paintSettings();
      S.saveSoon();
      UI.toast(count ? count + ' MIDI input' + (count > 1 ? 's' : '') + ' connected'
                     : 'MIDI armed — plug in a controller', 'success');
    } catch (e) {
      UI.toast('MIDI permission refused', 'error');
    }
  }

  /* The pattern on its own: steps, chances, tempo and chords. No mix, no FX,
     so it can be handed to someone without also handing them your sound. */
  function exportPattern() {
    var payload = {
      app: 'lofi-studio-pro',
      version: 2,
      kind: 'pattern',
      exported: new Date().toISOString(),
      state: {
        bpm: S.data.bpm,
        vibe: S.data.vibe,
        patternId: S.data.patternId,
        steps: JSON.parse(JSON.stringify(S.data.steps)),
        probs: JSON.parse(JSON.stringify(S.data.probs))
      }
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lofi-pattern-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    UI.toast('Pattern exported', 'success');
  }

  function importFile(file) {
    if (!file) return;
    if (file.size > 512 * 1024) { UI.toast('That file is too large to be a beat', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function () {
      var obj;
      try { obj = JSON.parse(reader.result); }
      catch (e) { UI.toast('That file is not valid JSON', 'error'); return; }
      var ok = S.importState(obj);
      if (!ok) { UI.toast('That file does not look like a beat', 'error'); return; }
      applySnapshot();
      UI.toast('Beat imported', 'success');
    };
    reader.onerror = function () { UI.toast('Could not read that file', 'error'); };
    reader.readAsText(file);
  }

  /* ------------------------------------------------------------ sleep timer
     The Sleep preset exists but nothing stopped it; this is the other half. */
  var sleepTimer = null;
  var SLEEP_STEPS = [0, 15, 30, 60, 90];
  function cycleSleepTimer() {
    var btn = $('set-sleep');
    var idx = SLEEP_STEPS.indexOf(S.data.sleep || 0);
    if (idx < 0) idx = 0;
    var next = SLEEP_STEPS[(idx + 1) % SLEEP_STEPS.length];
    S.data.sleep = next;
    clearTimeout(sleepTimer);
    sleepTimer = null;
    if (next === 0) {
      btn.textContent = 'Off';
      UI.toast('Sleep timer off', 'info');
    } else {
      btn.textContent = next + ' min';
      sleepTimer = setTimeout(function () {
        stop();
        S.data.sleep = 0;
        btn.textContent = 'Off';
        UI.toast('Sleep timer — stopping', 'info');
      }, next * 60000);
      UI.toast('Stopping in ' + next + ' minutes', 'success');
    }
    S.saveSoon();
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

  /* ----------------------------------------------------------------- share */
  function shareLink() {
    var url = location.origin + location.pathname +
      '?s=' + S.encode() + '&b=' + S.data.bpm + '&v=' + S.data.vibe;
    if (navigator.share) {
      navigator.share({ title: 'A lofi beat', url: url }).catch(function () { copy(url); });
    } else {
      copy(url);
    }
  }
  function copy(text) {
    var done = function () { UI.toast('Link copied', 'success'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); UI.toast('Link copied', 'success'); }
    catch (e) { UI.toast('Could not copy — long-press the address bar', 'warn'); }
    ta.remove();
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
    $('btn-share').addEventListener('click', shareLink);
    $('btn-save-preset').addEventListener('click', savePreset);
    $('btn-undo').addEventListener('click', undo);
    $('btn-shortcuts').addEventListener('click', function () { UI.showSheet('shortcuts'); });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { UI.hideSheet(b.closest('.sheet')); });
    });
    document.querySelectorAll('.sheet').forEach(function (sh) {
      sh.addEventListener('click', function (e) { if (e.target === sh) UI.hideSheet(sh); });
    });
    $('preset-name').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); savePreset(); }
    });
    $('btn-export').addEventListener('click', exportFile);
    $('btn-midi').addEventListener('click', exportMidi);
    $('btn-export-pattern').addEventListener('click', exportPattern);
    $('set-midi').addEventListener('click', toggleMidi);
    $('btn-clear').addEventListener('click', clearPattern);
    $('btn-song').addEventListener('click', toggleSong);
    $('btn-chance').addEventListener('click', function () {
      UI.setChanceMode(!UI.isChanceMode());
      UI.toast(UI.isChanceMode() ? 'Chance mode — tap a step to set how often it fires' : 'Step mode', 'info');
    });
    bindSongSlots();
    $('btn-import').addEventListener('click', function () { $('import-file').click(); });
    $('import-file').addEventListener('change', function () {
      importFile(this.files && this.files[0]);
      this.value = '';
    });

    /* dropping a beat file anywhere in the window imports it */
    document.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') > -1) {
        e.preventDefault();
        document.body.classList.add('is-dropping');
      }
    });
    document.addEventListener('dragleave', function (e) {
      if (e.target === document.documentElement) document.body.classList.remove('is-dropping');
    });
    document.addEventListener('drop', function (e) {
      document.body.classList.remove('is-dropping');
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault();
      importFile(e.dataTransfer.files[0]);
    });
    $('set-sleep').addEventListener('click', cycleSleepTimer);
    $('set-sleep').textContent = (S.data.sleep ? S.data.sleep + ' min' : 'Off');
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
    $('set-metro').addEventListener('click', function () {
      S.data.metro = !S.data.metro;
      UI.paintSettings();
      S.saveSoon();
    });
    $('set-countin').addEventListener('click', function () {
      S.data.countIn = !S.data.countIn;
      UI.paintSettings();
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
      if (tag === 'input' || tag === 'textarea') return;
      var cmd = e.metaKey || e.ctrlKey;
      if (e.target.getAttribute && e.target.getAttribute('role') === 'slider') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      var k = e.key.toLowerCase();
      if (k === '?') { UI.showSheet('shortcuts'); return; }
      if (k === 'escape') { document.querySelectorAll('.sheet').forEach(function (sh) { UI.hideSheet(sh); }); return; }
      if (k === ' ') { e.preventDefault(); toggle(); }
      else if (k === 's') { surprise(); }
      else if (k === 'x') { panic(); }
      else if (k === 'r') { toggleRecord(); }
      else if (k === 'b') {
        var idx = LS.THEME_IDS.indexOf(S.data.theme);
        applyTheme(LS.THEME_IDS[(idx + 1) % LS.THEME_IDS.length]);
      }
    });

    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', function () { if (!playing) play(); });
        navigator.mediaSession.setActionHandler('pause', function () { if (playing) stop(); });
        navigator.mediaSession.setActionHandler('stop', function () { panic(); });
      } catch (e) {}
    }

    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { LS.Viz.resize(); }, 150);
    });
    document.addEventListener('visibilitychange', function () {
      LS.Viz.pause(document.hidden);
      if (document.hidden) return;
      if (playing) keepAwake();
      /* iOS suspends the AudioContext on a phone call, a lock or a long
         background. Without this the app comes back looking like it is
         playing and making no sound at all. */
      try {
        if (typeof Tone !== 'undefined' && Tone.context.state === 'suspended') {
          Tone.start().catch(function () {});
        }
      } catch (e) {}
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
        navigator.serviceWorker.register('./sw.js').then(function (reg) {
          reg.addEventListener('updatefound', function () {
            var sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', function () {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                UI.toast('A new version is ready', 'info', {
                  label: 'Reload',
                  fn: function () { location.reload(); }
                });
              }
            });
          });
        }).catch(function (err) {
          console.warn('[Lofi] Service worker not registered', err);
        });
      });
    }

    /* iOS never fires beforeinstallprompt, so the install button simply does
       not exist there. One sheet, once, is the whole fix. */
    var isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var standalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    var told = false;
    try { told = localStorage.getItem('lofi-ios-tip') === '1'; } catch (e) {}
    if (isIos && !standalone && !told) {
      setTimeout(function () {
        var sheet = $('ios-tip');
        if (!sheet) return;
        sheet.hidden = false;
        var close = function () {
          sheet.hidden = true;
          try { localStorage.setItem('lofi-ios-tip', '1'); } catch (e) {}
        };
        sheet.querySelector('button').addEventListener('click', close);
        sheet.addEventListener('click', function (e) { if (e.target === sheet) close(); });
      }, 2500);
    }
  }

  function boot() {
    var loaded = S.load();
    document.body.dataset.theme = S.data.theme;
    S.initHistory();

    UI.init();
    wire();
    setupPwa();

    applyTheme(S.data.theme);
    A.setBpm(S.data.bpm);
    A.setViz(S.data.viz);
    UI.paintAll();
    UI.setView(S.data.view || 'studio');

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

    /* A shared beat: ?s=<48 hex>&b=<bpm>&v=<vibe> */
    var shared = /[?&]s=([0-9a-f]{48})/i.exec(location.search);
    if (shared) {
      var steps = S.decode(shared[1]);
      if (steps) {
        LS.TRACK_IDS.forEach(function (t) { S.data.steps[t] = steps[t]; });
        S.data.patternId = null;
        S.data.preset = null;
        var b = /[?&]b=(\d{2,3})/.exec(location.search);
        var vb = /[?&]v=([a-z]+)/.exec(location.search);
        if (b) setBpm(parseInt(b[1], 10));
        if (vb && LS.VIBES[vb[1]]) S.data.vibe = vb[1];
        UI.paintSequencer();
        UI.paintPatterns();
        UI.paintVibes();
        UI.paintNowPlaying();
        /* Apply once, then drop the query so a reload does not silently
           throw away whatever the person edited afterwards. */
        try { history.replaceState({}, '', location.pathname); } catch (e) {}
        UI.toast('Loaded a shared beat — press play', 'success');
      }
    }

    if (loaded.migrated) {
      UI.toast('Your old pattern was carried over', 'success');
    }
    /* Tone.js is fetched on the first gesture, so its absence here is normal. */
    console.log('[Lofi] ready · ' + LS.TRACK_IDS.length + ' tracks · ' + LS.PATTERN_ORDER.length + ' patterns');
  }

  /* Public surface used by ui.js and by the test harness. */
  LS.App = {
    play: play, stop: stop, toggle: toggle, panic: panic,
    undo: undo, redo: redo, haptic: haptic,
    enterSlot: enterSlot, toggleSong: toggleSong,
    savePreset: savePreset, loadPreset: loadPreset, deletePreset: deletePreset,
    exportFile: exportFile, importFile: importFile, exportMidi: exportMidi,
    exportPattern: exportPattern, handleMidi: handleMidi, toggleMidi: toggleMidi,
    clearPattern: clearPattern,
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
