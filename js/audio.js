/* =============================================================================
   Lofi Studio Pro — audio.js
   The whole synthesis engine. Nothing here touches the DOM; the UI calls in
   through the small public surface at the bottom.

   Signal flow
     instruments -> per-track Channel -\
     ambience layers -> per-layer Gain ---> master Volume -> Limiter -> Analyser -> Destination
     vinyl crackle -> highpass -> envelope /                       \
                          (kept out of the lowpass so pops stay crisp)  -> Recorder

   Every setter is a no-op until build() has run, so the UI can push state at
   any time — before the first gesture, during boot, after a reset.
   ========================================================================== */
(function (LS) {
  'use strict';

  var A = {
    ready: false,
    building: null,
    inst: {},
    ch: {},
    fx: {},
    master: null,
    limiter: null,
    analyser: null,
    recorder: null,
    crackle: {},
    amb: {},
    seqId: null,
    step: -1,
    bar: 0,
    transportStarted: false
  };

  function db(pct) {
    if (pct <= 0) return -Infinity;
    return Tone.gainToDb(Math.min(1, pct / 100));
  }

  /* ---------------------------------------------------------------- build */
  async function build() {
    var S = LS.State.data;

    A.master = new Tone.Volume(db(S.master));
    A.limiter = new Tone.Limiter(-1.5);
    A.analyser = new Tone.Analyser(S.viz === 'wave' ? 'waveform' : 'fft', S.viz === 'wave' ? 512 : 96);
    A.master.chain(A.limiter, A.analyser, Tone.Destination);

    A.fx.filter = new Tone.Filter({ frequency: S.fx.filter, type: 'lowpass', rolloff: -24, Q: 0.7 });
    A.fx.tape = new Tone.Distortion({ distortion: (S.fx.tape / 100) * 0.4, wet: S.fx.tape / 100, oversample: '2x' });
    A.fx.chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 3.5, depth: 0.7, wet: S.fx.chorus / 100 }).start();
    A.fx.wow = new Tone.Tremolo({ frequency: 2.2, depth: S.fx.wow / 100, wet: S.fx.wow / 100 }).start();
    A.fx.reverb = new Tone.Reverb({ decay: 2.4, wet: S.fx.reverb / 100 });

    /* Tone.js generates the impulse response on the main thread. Race it so a
       slow device never blocks the first note behind a silent reverb. */
    try {
      await Promise.race([
        A.fx.reverb.generate(),
        new Promise(function (_, reject) { setTimeout(function () { reject(new Error('timeout')); }, 4000); })
      ]);
    } catch (e) {
      console.warn('[Lofi] Reverb IR not ready, running dry', e);
    }

    buildInstruments();
    buildCrackle();

    A.ready = true;
    return true;
  }

  function buildInstruments() {
    LS.TRACK_IDS.forEach(function (id) {
      var t = LS.State.data.tracks[id];
      A.ch[id] = new Tone.Channel({ volume: db(t.vol), mute: t.mute, solo: t.solo })
        .chain(A.fx.filter, A.fx.tape, A.fx.chorus, A.fx.wow, A.fx.reverb, A.master);
    });

    A.inst.kick = new Tone.MembraneSynth({
      pitchDecay: 0.045, octaves: 6,
      envelope: { attack: 0.001, decay: 0.32, sustain: 0.01, release: 0.35 }
    }).connect(A.ch.kick);

    A.inst.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0 }
    }).connect(A.ch.snare);

    /* Hats are high-passed noise, not MetalSynth: the metal oscillator bank is
       the heaviest voice in Tone.js and hats fire up to 11 times a bar. */
    A.hatFilter = new Tone.Filter({ frequency: 7800, type: 'highpass', Q: 0.6 }).connect(A.ch.hat);
    A.inst.hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0 }
    }).connect(A.hatFilter);

    A.inst.bass = new Tone.FMSynth({
      harmonicity: 1, modulationIndex: 3,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.5 }
    }).connect(A.ch.bass);

    A.inst.keys = new Tone.PolySynth(Tone.AMSynth, {
      maxPolyphony: 12,
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.45, release: 1.1 },
      modulation: { type: 'sine' }
    }).connect(A.ch.keys);

    A.inst.melody = new Tone.FMSynth({
      harmonicity: 2, modulationIndex: 2,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.7 }
    }).connect(A.ch.melody);
  }

  function buildCrackle() {
    var S = LS.State.data;
    A.crackle.gain = new Tone.Gain((S.fx.crackle / 100) * 0.35).connect(A.master);
    A.crackle.env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.014, sustain: 0, release: 0.01 })
      .connect(A.crackle.gain);
    A.crackle.filter = new Tone.Filter({ frequency: 2600, type: 'highpass' }).connect(A.crackle.env);
    A.crackle.noise = new Tone.Noise('pink').connect(A.crackle.filter).start();

    A.crackle.loopId = Tone.Transport.scheduleRepeat(function (time) {
      if (Math.random() < (LS.State.data.fx.crackle / 100) * 0.55) {
        A.crackle.env.triggerAttackRelease(0.014, time);
      }
    }, '32n');
  }

  /* ------------------------------------------------------------ lifecycle */
  function ensure() {
    if (A.ready) return Promise.resolve(true);
    if (A.building) return A.building;

    A.building = (async function () {
      try {
        if (typeof Tone === 'undefined') throw new Error('Tone.js missing');
        if (Tone.context.state !== 'running') await Tone.start();
        await build();
        A.building = null;
        return true;
      } catch (e) {
        A.building = null;
        console.error('[Lofi] Audio engine failed', e);
        throw e;
      }
    })();

    return A.building;
  }

  /* -------------------------------------------------------------- setters */
  function setMaster(v) { if (A.ready) A.master.volume.value = db(v); }
  function setFilter(v) { if (A.ready) A.fx.filter.frequency.value = v; }
  function setTape(v) {
    if (!A.ready) return;
    A.fx.tape.distortion = (v / 100) * 0.4;
    A.fx.tape.wet.value = v / 100;
  }
  function setCrackle(v) { if (A.ready) A.crackle.gain.gain.value = (v / 100) * 0.35; }
  function setReverb(v) { if (A.ready) A.fx.reverb.wet.value = v / 100; }
  function setChorus(v) { if (A.ready) A.fx.chorus.wet.value = v / 100; }
  function setWow(v) {
    if (!A.ready) return;
    A.fx.wow.depth.value = v / 100;
    A.fx.wow.wet.value = v / 100;
  }
  function setTrackVol(id, v) { if (A.ready && A.ch[id]) A.ch[id].volume.value = db(v); }
  function setTrackMute(id, m) { if (A.ready && A.ch[id]) A.ch[id].mute = m; }
  function setTrackSolo(id, s) { if (A.ready && A.ch[id]) A.ch[id].solo = s; }
  function setViz(type) { if (A.ready && A.analyser) A.analyser.type = type === 'wave' ? 'waveform' : 'fft'; }

  function applyAll() {
    var S = LS.State.data;
    setMaster(S.master);
    setFilter(S.fx.filter);
    setTape(S.fx.tape);
    setCrackle(S.fx.crackle);
    setReverb(S.fx.reverb);
    setChorus(S.fx.chorus);
    setWow(S.fx.wow);
    LS.TRACK_IDS.forEach(function (t) {
      setTrackVol(t, S.tracks[t].vol);
      setTrackMute(t, S.tracks[t].mute);
      setTrackSolo(t, S.tracks[t].solo);
    });
  }

  /* ------------------------------------------------------------ transport */
  function scheduleSequence() {
    clearSequence();
    A.step = -1;
    A.bar = -1;
    A.seqId = Tone.Transport.scheduleRepeat(function (time) {
      var i = (A.step + 1) % LS.STEP_COUNT;
      A.step = i;
      if (i === 0) A.bar = (A.bar + 1) % 4;

      var at = time;
      var swing = LS.State.data.swing;
      if (i % 2 === 1 && swing > 0) {
        at = time + Tone.Time('16n').toSeconds() * (swing / 100) * 0.5;
      }

      triggerStep(i, A.bar, at);

      Tone.Draw.schedule(function () {
        if (LS.UI && LS.UI.highlight) LS.UI.highlight(i);
      }, time);
    }, '16n');
  }

  function clearSequence() {
    if (A.seqId !== null && A.seqId !== undefined) {
      Tone.Transport.clear(A.seqId);
      A.seqId = null;
    }
  }

  function triggerStep(i, bar, time) {
    var S = LS.State.data;
    var vibe = LS.VIBES[S.vibe] || LS.VIBES.jazz;
    var chord = vibe.chords[bar % vibe.chords.length];

    for (var t = 0; t < LS.TRACK_IDS.length; t++) {
      var id = LS.TRACK_IDS[t];
      if (!S.steps[id][i]) continue;
      var inst = A.inst[id];
      if (!inst) continue;
      try {
        if (id === 'kick') inst.triggerAttackRelease('C1', '8n', time);
        else if (id === 'snare') inst.triggerAttackRelease('8n', time);
        else if (id === 'hat') inst.triggerAttackRelease('32n', time, i % 4 === 0 ? 1 : 0.55);
        else if (id === 'bass') inst.triggerAttackRelease(LS.octave(chord[0], -1), '8n', time);
        else if (id === 'keys') inst.triggerAttackRelease(chord, '2n', time);
        else if (id === 'melody') inst.triggerAttackRelease(LS.octave(chord[i % chord.length], 1), '16n', time);
      } catch (e) {
        console.warn('[Lofi] trigger failed', id, e);
      }
    }

    if (S.autoFill && bar === 3 && i >= 12 && !S.tracks.snare.mute) {
      try { A.inst.snare.triggerAttackRelease('16n', time, 0.5 + (i - 12) * 0.12); } catch (e) {}
    }
  }

  /* Audition a single voice immediately — used when a pad is switched on, so
     tapping a step tells you what you just added. */
  function audition(id) {
    if (!A.ready || !A.inst[id]) return;
    var S = LS.State.data;
    var chord = (LS.VIBES[S.vibe] || LS.VIBES.jazz).chords[0];
    var now = Tone.now() + 0.02;
    try {
      if (id === 'kick') A.inst.kick.triggerAttackRelease('C1', '8n', now);
      else if (id === 'snare') A.inst.snare.triggerAttackRelease('16n', now);
      else if (id === 'hat') A.inst.hat.triggerAttackRelease('32n', now, 0.8);
      else if (id === 'bass') A.inst.bass.triggerAttackRelease(LS.octave(chord[0], -1), '8n', now);
      else if (id === 'keys') A.inst.keys.triggerAttackRelease(chord, '8n', now);
      else if (id === 'melody') A.inst.melody.triggerAttackRelease(LS.octave(chord[2] || chord[0], 1), '8n', now);
    } catch (e) {}
  }

  function startTransport() {
    Tone.Transport.bpm.value = LS.State.data.bpm;
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
    A.transportStarted = true;
  }
  function stopTransport() {
    Tone.Transport.stop();
    A.transportStarted = false;
  }
  function setBpm(v) { if (A.ready) Tone.Transport.bpm.value = v; }

  /* ------------------------------------------------------------- ambience */
  var builders = {
    rain: function (out) {
      var noise = new Tone.Noise('pink').start();
      var filter = new Tone.Filter({ frequency: 3400, type: 'lowpass', Q: 0.4 });
      var lfo = new Tone.LFO({ frequency: 0.15, min: 2600, max: 5200 }).start();
      lfo.connect(filter.frequency);
      noise.chain(filter, out);
      return function () { noise.stop().dispose(); filter.dispose(); lfo.dispose(); };
    },
    fireplace: function (out) {
      var noise = new Tone.Noise('brown').start();
      var filter = new Tone.Filter({ frequency: 700, type: 'lowpass' });
      noise.chain(filter, out);
      var env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 }).connect(out);
      var popFilter = new Tone.Filter({ frequency: 1800, type: 'highpass' }).connect(env);
      var popNoise = new Tone.Noise('white').connect(popFilter).start();
      var loop = new Tone.Loop(function (time) {
        if (Math.random() < 0.35) env.triggerAttackRelease(0.03, time);
      }, '8n').start(0);
      return function () {
        noise.stop().dispose(); filter.dispose();
        popNoise.stop().dispose(); popFilter.dispose(); env.dispose(); loop.dispose();
      };
    },
    cafe: function (out) {
      var noise = new Tone.Noise('pink').start();
      var filter = new Tone.Filter({ frequency: 900, type: 'bandpass', Q: 0.7 });
      var gain = new Tone.Gain(0);
      var lfo = new Tone.LFO({ frequency: 0.25, min: 0.35, max: 0.9 }).start();
      lfo.connect(gain.gain);
      noise.chain(filter, gain, out);
      var clink = new Tone.MetalSynth({
        frequency: 800, envelope: { attack: 0.001, decay: 0.15, release: 0.05 },
        harmonicity: 8, modulationIndex: 20, resonance: 3000, octaves: 1
      }).connect(out);
      clink.volume.value = -20;
      var loop = new Tone.Loop(function (time) {
        if (Math.random() < 0.12) clink.triggerAttackRelease('16n', time);
      }, '4n').start(0);
      return function () {
        noise.stop().dispose(); filter.dispose(); gain.dispose(); lfo.dispose();
        clink.dispose(); loop.dispose();
      };
    },
    wind: function (out) {
      var noise = new Tone.Noise('pink').start();
      var filter = new Tone.Filter({ frequency: 700, type: 'bandpass', Q: 1.1 });
      var lfo = new Tone.LFO({ frequency: 0.08, min: 250, max: 1500 }).start();
      lfo.connect(filter.frequency);
      noise.chain(filter, out);
      return function () { noise.stop().dispose(); filter.dispose(); lfo.dispose(); };
    },
    birds: function (out) {
      var synth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.05 } }).connect(out);
      synth.volume.value = -10;
      var notes = ['C6', 'D6', 'E6', 'G6', 'A6'];
      var loop = new Tone.Loop(function (time) {
        if (Math.random() < 0.25) {
          synth.triggerAttackRelease(notes[Math.floor(Math.random() * notes.length)], '32n', time);
          if (Math.random() < 0.5) synth.triggerAttackRelease(notes[Math.floor(Math.random() * notes.length)], '32n', time + 0.09);
        }
      }, '4n').start(0);
      return function () { synth.dispose(); loop.dispose(); };
    },
    thunder: function (out) {
      var noise = new Tone.Noise('brown').start();
      var filter = new Tone.Filter({ frequency: 200, type: 'lowpass' });
      var env = new Tone.AmplitudeEnvelope({ attack: 0.5, decay: 1.5, sustain: 0.08, release: 2 }).connect(out);
      noise.chain(filter, env);
      var loop = new Tone.Loop(function (time) {
        if (Math.random() < 0.1) env.triggerAttackRelease(1 + Math.random() * 2, time);
      }, '2n').start(0);
      return function () { noise.stop().dispose(); filter.dispose(); env.dispose(); loop.dispose(); };
    },
    ocean: function (out) {
      var noise = new Tone.Noise('pink').start();
      var filter = new Tone.Filter({ frequency: 900, type: 'lowpass' });
      var gain = new Tone.Gain(0);
      var lfoF = new Tone.LFO({ frequency: 0.09, min: 400, max: 1800 }).start();
      var lfoA = new Tone.LFO({ frequency: 0.09, min: 0.25, max: 0.9, phase: 90 }).start();
      lfoF.connect(filter.frequency);
      lfoA.connect(gain.gain);
      noise.chain(filter, gain, out);
      return function () {
        noise.stop().dispose(); filter.dispose(); gain.dispose();
        lfoF.dispose(); lfoA.dispose();
      };
    },
    night: function (out) {
      var cricket = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.02, sustain: 0.3, release: 0.02 } }).connect(out);
      cricket.volume.value = -22;
      var loop = new Tone.Loop(function (time) {
        if (Math.random() < 0.5) {
          var n = 3 + Math.floor(Math.random() * 4);
          for (var i = 0; i < n; i++) cricket.triggerAttackRelease('A7', '64n', time + i * 0.06);
        }
      }, '4n').start(0);
      var hum = new Tone.Noise('brown').start();
      var humFilter = new Tone.Filter({ frequency: 220, type: 'lowpass' });
      var humGain = new Tone.Gain(0.22);
      hum.chain(humFilter, humGain, out);
      return function () {
        cricket.dispose(); loop.dispose();
        hum.stop().dispose(); humFilter.dispose(); humGain.dispose();
      };
    },
    vinyl: function (out) {
      var hiss = new Tone.Noise('pink').start();
      var hissFilter = new Tone.Filter({ frequency: 3500, type: 'lowpass' });
      var hissGain = new Tone.Gain(0.3);
      hiss.chain(hissFilter, hissGain, out);
      var env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 }).connect(out);
      var popFilter = new Tone.Filter({ frequency: 2000, type: 'highpass' }).connect(env);
      var popNoise = new Tone.Noise('white').connect(popFilter).start();
      var loop = new Tone.Loop(function (time) {
        if (Math.random() < 0.45) env.triggerAttackRelease(0.02, time);
      }, '16n').start(0);
      var rumble = new Tone.Noise('brown').start();
      var rumbleFilter = new Tone.Filter({ frequency: 90, type: 'lowpass' });
      var rumbleGain = new Tone.Gain(0.15);
      rumble.chain(rumbleFilter, rumbleGain, out);
      return function () {
        hiss.stop().dispose(); hissFilter.dispose(); hissGain.dispose();
        popNoise.stop().dispose(); popFilter.dispose(); env.dispose(); loop.dispose();
        rumble.stop().dispose(); rumbleFilter.dispose(); rumbleGain.dispose();
      };
    }
  };

  function ambienceOn(id) {
    if (!A.ready || A.amb[id]) return;
    var vol = new Tone.Gain((LS.State.data.amb[id].vol / 100) * 0.9).connect(A.master);
    A.amb[id] = { gain: vol, teardown: builders[id](vol) };
  }
  function ambienceOff(id) {
    var e = A.amb[id];
    if (!e) return;
    try { e.teardown(); } catch (err) { console.warn('[Lofi] ambience teardown', id, err); }
    try { e.gain.dispose(); } catch (err) {}
    delete A.amb[id];
  }
  function ambienceVol(id, v) { if (A.amb[id]) A.amb[id].gain.gain.value = (v / 100) * 0.9; }
  function ambienceCount() { return Object.keys(A.amb).length; }

  /* ------------------------------------------------------------- recorder */
  function canRecord() {
    return A.ready && typeof Tone.Recorder !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined';
  }
  async function recordStart() {
    if (!canRecord()) throw new Error('Recording is not supported in this browser');
    if (!A.recorder) {
      A.recorder = new Tone.Recorder();
      A.limiter.connect(A.recorder);
    }
    A.recorder.start();
  }
  async function recordStop() {
    if (!A.recorder) return null;
    return await A.recorder.stop();
  }

  /* ---------------------------------------------------------------- panic */
  function panic() {
    try {
      Tone.Transport.stop();
      A.transportStarted = false;
      clearSequence();
      if (A.inst.keys && A.inst.keys.releaseAll) A.inst.keys.releaseAll();
      Object.keys(A.amb).forEach(ambienceOff);
      /* Ramp the master to silence so release tails die immediately, then
         restore. Cheaper and more reliable than disposing and rebuilding. */
      if (A.master) {
        var now = Tone.now();
        A.master.volume.cancelScheduledValues(now);
        A.master.volume.setValueAtTime(A.master.volume.value, now);
        A.master.volume.linearRampToValueAtTime(-80, now + 0.05);
        setTimeout(function () {
          try { A.master.volume.setValueAtTime(db(LS.State.data.master), Tone.now()); } catch (e) {}
        }, 220);
      }
    } catch (e) {
      console.warn('[Lofi] panic', e);
    }
  }

  function dispose() {
    try {
      if (typeof Tone === 'undefined') return;
      Tone.Transport.stop();
      Tone.Transport.cancel();
      Object.keys(A.amb).forEach(ambienceOff);
      clearSequence();
      Object.keys(A.inst).forEach(function (k) { try { A.inst[k].dispose(); } catch (e) {} });
      Object.keys(A.ch).forEach(function (k) { try { A.ch[k].dispose(); } catch (e) {} });
      Object.keys(A.fx).forEach(function (k) { try { A.fx[k].dispose(); } catch (e) {} });
      ['gain', 'env', 'filter', 'noise'].forEach(function (k) {
        if (A.crackle[k]) { try { A.crackle[k].dispose(); } catch (e) {} }
      });
      if (A.hatFilter) { try { A.hatFilter.dispose(); } catch (e) {} }
      if (A.analyser) { try { A.analyser.dispose(); } catch (e) {} }
      if (A.limiter) { try { A.limiter.dispose(); } catch (e) {} }
      if (A.master) { try { A.master.dispose(); } catch (e) {} }
    } catch (e) {
      console.warn('[Lofi] dispose', e);
    }
  }

  LS.Audio = {
    ensure: ensure,
    get ready() { return A.ready; },
    get analyser() { return A.analyser; },
    get transportStarted() { return A.transportStarted; },
    applyAll: applyAll,
    setMaster: setMaster,
    setFilter: setFilter,
    setTape: setTape,
    setCrackle: setCrackle,
    setReverb: setReverb,
    setChorus: setChorus,
    setWow: setWow,
    setTrackVol: setTrackVol,
    setTrackMute: setTrackMute,
    setTrackSolo: setTrackSolo,
    setViz: setViz,
    setBpm: setBpm,
    scheduleSequence: scheduleSequence,
    clearSequence: clearSequence,
    startTransport: startTransport,
    stopTransport: stopTransport,
    audition: audition,
    ambienceOn: ambienceOn,
    ambienceOff: ambienceOff,
    ambienceVol: ambienceVol,
    ambienceCount: ambienceCount,
    canRecord: canRecord,
    recordStart: recordStart,
    recordStop: recordStop,
    panic: panic,
    dispose: dispose,
    position: function () { return { step: A.step, bar: A.bar }; }
  };
})(window.LS = window.LS || {});
