/* =============================================================================
   Lofi Studio Pro — audio.js
   The synthesis engine. Nothing here touches the DOM.

   Signal flow
     six instrument channels ─┐
     vinyl crackle ───────────┼─> mixBus ─> compressor ─> limiter ─> fader ─> master ─> analyser ─> out
     ambience layers ─────────┘                (glue)        (-1 dB)    (fades)   (user)     (meter)
        └ both bypass the low-pass on purpose, so rain and crackle stay crisp

   Voice discipline (this is what stops the clicks):
     every voice opens from near-silence with a >=2 ms ramp, every envelope
     ends by ramping to 0.001 rather than being cut, and nothing monophonic
     retriggers on a running note. Pitched parts are polyphonic so a new note
     never truncates a ringing one.
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
    fader: null,
    comp: null,
    limiter: null,
    mixBus: null,
    analyser: null,
    recorder: null,
    crackle: {},
    amb: {},
    seqId: null,
    step: -1,
    bar: 0,
    transportStarted: false
  };

  var SR = 44100;
  var tonePromise = null;

  /* The audio library is 349 KB — three quarters of the whole payload — and
     nothing needs it until the first gesture. It is fetched on demand and
     served from the service-worker cache, so the first paint never waits. */
  function loadTone() {
    if (typeof Tone !== 'undefined') return Promise.resolve();
    if (tonePromise) return tonePromise;
    tonePromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = './vendor/tone.min.js';
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        tonePromise = null;
        reject(new Error('Tone.js could not be loaded'));
      };
      document.head.appendChild(s);
    });
    return tonePromise;
  }

  function db(pct) {
    if (pct <= 0) return -Infinity;
    return Tone.gainToDb(Math.min(1, pct / 100));
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* Velocity: 1 ghost, 2 normal, 3 accent. Older saves used 1 for "on". */
  function velFor(v) {
    if (v === 3) return 1;
    if (v === 1) return 0.45;
    return 0.78;
  }

  /* ------------------------------------------------------------- reverb IR
     Built synchronously from decaying noise instead of Tone.Reverb.generate().
     generate() is async, can time out on a slow device, and a reverb without
     an impulse response is exactly the kind of half-built node that produces
     a burst of noise the first time it is hit. */
  function makeImpulse(seconds, decay) {
    var len = Math.max(1, Math.floor(SR * seconds));
    var buf = Tone.getContext().createBuffer(2, len, SR);
    for (var c = 0; c < 2; c++) {
      var data = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        /* a short pre-delay and an exponential tail, slightly decorrelated
           between channels so the reverb has width */
        var pre = i < SR * 0.008 ? 0 : 1;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * pre * (c ? 0.94 : 1);
      }
    }
    return buf;
  }

  /* ---------------------------------------------------------------- build */
  async function build() {
    var S = LS.State.data;

    A.master = new Tone.Volume(db(S.master));
    A.fader = new Tone.Gain(1);
    /* -2.5 dBFS, not -1: a Tone.Limiter is a compressor with a 3 ms attack, not
       a brick wall, and a sharp kick overshoots its ceiling. Measured on a CI
       runner it reached +0.25 dBFS at -1, so the ceiling buys the overshoot. */
    A.limiter = new Tone.Limiter(-2.5);
    A.comp = new Tone.Compressor({ threshold: -8, knee: 8, ratio: 2, attack: 0.008, release: 0.25 });
    A.mixBus = new Tone.Gain(3.3);
    /* Analyser size must be a power of two: Tone doubles it for fftSize, and
       an fftSize of 192 is an IndexSizeError that takes the whole engine down. */
    A.analyser = new Tone.Analyser(S.viz === 'wave' ? 'waveform' : 'fft', S.viz === 'wave' ? 512 : 128);

    A.mixBus.chain(A.comp, A.limiter, A.fader, A.master, A.analyser, Tone.Destination);

    /* 25 Hz high-pass: the tape stage is a waveshaper, and a waveshaper fed a
       kick with a DC offset turns that offset into a thump. */
    A.fx.dc = new Tone.Filter({ frequency: 25, type: 'highpass', rolloff: -12 });
    A.fx.filter = new Tone.Filter({ frequency: S.fx.filter, type: 'lowpass', rolloff: -24, Q: 0.6 });
    A.fx.tape = new Tone.Distortion({ distortion: (S.fx.tape / 100) * 0.3, wet: S.fx.tape / 100, oversample: '2x' });
    A.fx.chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 3.5, depth: 0.5, wet: S.fx.chorus / 100 }).start();
    A.fx.wow = new Tone.Tremolo({ frequency: 2.4, depth: S.fx.wow / 100, wet: S.fx.wow / 100 }).start();
    /* Reverb is a parallel send, not an insert: the dry signal has to reach
       the bus whether or not the reverb is wet. */
    A.fx.pre = new Tone.Gain(1);
    A.fx.dry = new Tone.Gain(1);
    A.fx.reverb = new Tone.Convolver({ buffer: new Tone.ToneAudioBuffer(makeImpulse(1.8, 3.0)) });
    A.fx.reverbWet = new Tone.Gain(S.fx.reverb / 100);

    A.fx.dc.chain(A.fx.filter, A.fx.tape, A.fx.chorus, A.fx.wow, A.fx.pre);
    A.fx.pre.connect(A.fx.dry);
    A.fx.pre.chain(A.fx.reverb, A.fx.reverbWet);
    A.fx.dry.connect(A.mixBus);
    A.fx.reverbWet.connect(A.mixBus);

    buildInstruments();
    buildCrackle();
    buildMetronome();

    A.ready = true;
    return true;
  }

  function buildInstruments() {
    var T = LS.TRACK_IDS;

    T.forEach(function (id) {
      var t = LS.State.data.tracks[id];
      A.ch[id] = new Tone.Channel({ volume: db(t.vol), mute: t.mute, solo: t.solo })
        .chain(A.fx.dc);
    });

    /* ---- kick: membrane with a short pitch drop ---- */
    A.inst.kick = new Tone.MembraneSynth({
      pitchDecay: 0.045, octaves: 5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.38, sustain: 0.01, release: 0.3 }
    }).connect(A.ch.kick);
    A.inst.kick.volume.value = -7;

    /* ---- snare: a body plus a band-limited noise crack ----
       Bare white noise is what makes a drum machine sound like a hiss; the
       tuned body underneath is what makes it read as a snare. */
    A.snareTone = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.11, sustain: 0, release: 0.05 }
    }).connect(A.ch.snare);
    A.snareTone.volume.value = -8;

    A.snareNoise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.002, decay: 0.15, sustain: 0 }
    });
    A.snareBand = new Tone.Filter({ frequency: 1800, type: 'bandpass', Q: 1.1 }).connect(A.ch.snare);
    A.snareNoise.connect(A.snareBand);
    A.snareNoise.volume.value = -1;

    /* ---- hat: band-limited noise with a metallic bell, not raw hiss ---- */
    A.hatBell = new Tone.Filter({ frequency: 9800, type: 'peaking', Q: 1.2, gain: 3 });
    A.hatHP = new Tone.Filter({ frequency: 7600, type: 'bandpass', Q: 1.1 });
    A.hatHP.chain(A.hatBell, A.ch.hat);
    A.inst.hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.004, decay: 0.052, sustain: 0 }
    }).connect(A.hatHP);
    A.inst.hat.volume.value = -8;

    /* ---- bass: sine FM, no square modulation (that is where the buzz came from) ---- */
    A.inst.bass = new Tone.FMSynth({
      harmonicity: 1, modulationIndex: 1.8,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.012, decay: 0.32, sustain: 0.32, release: 0.28 }
    }).connect(A.ch.bass);
    A.inst.bass.volume.value = -4;

    /* ---- keys: a polyphonic electric piano. Polyphonic because a mono voice
       cuts its own release on every chord change, and that cut is a click. ---- */
    A.inst.keys = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 10,
      harmonicity: 2, modulationIndex: 1.6,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.5, sustain: 0.22, release: 1.1 }
    }).connect(A.ch.keys);
    A.inst.keys.volume.value = -10;

    /* ---- melody: polyphonic so consecutive 16ths ring into each other ---- */
    A.inst.melody = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 6,
      harmonicity: 1.5, modulationIndex: 1.1,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.008, decay: 0.22, sustain: 0.12, release: 0.45 }
    }).connect(A.ch.melody);
    A.inst.melody.volume.value = -11;
  }

  /* A metronome is one oscillator and a 2 ms ramp. It is armed on the same
     transport as the beat, so it can never drift. */
  function buildMetronome() {
    A.click = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 }
    }).connect(A.mixBus);
    A.click.volume.value = -14;
    A.metroId = Tone.Transport.scheduleRepeat(function (time) {
      /* clicks also cover a count-in bar even when the metronome is off,
         otherwise the count-in is a silent bar of nothing */
      if (!LS.State.data.metro && !A.countingIn) return;
      var pos = Tone.Transport.position.split(':');
      var beat = parseInt(pos[1], 10) || 0;
      A.click.triggerAttackRelease(beat === 0 ? 'C6' : 'G5', '32n', time, beat === 0 ? 1 : 0.6);
    }, '4n');
  }

  function buildCrackle() {
    var S = LS.State.data;

    /* A vinyl bed is mostly continuous surface hiss with occasional pops, not
       a machine-gun of clicks. Two layers: a quiet hiss, sparse pops. */
    A.crackle.hiss = new Tone.Noise('pink');
    A.crackle.hissHP = new Tone.Filter({ frequency: 1200, type: 'highpass', Q: 0.5 });
    A.crackle.hissLP = new Tone.Filter({ frequency: 7000, type: 'lowpass', Q: 0.5 });
    A.crackle.gain = new Tone.Gain((S.fx.crackle / 100) * 0.10).connect(A.mixBus);
    A.crackle.hiss.chain(A.crackle.hissHP, A.crackle.hissLP, A.crackle.gain);
    A.crackle.hiss.start();

    A.crackle.env = new Tone.AmplitudeEnvelope({ attack: 0.001, decay: 0.012, sustain: 0, release: 0.008 })
      .connect(A.crackle.gain);
    A.crackle.filter = new Tone.Filter({ frequency: 2400, type: 'highpass' }).connect(A.crackle.env);
    A.crackle.noise = new Tone.Noise('white').connect(A.crackle.filter).start();

    A.crackle.loopId = Tone.Transport.scheduleRepeat(function (time) {
      /* ~4 pops a second at full crackle, scaled down from there */
      if (Math.random() < (LS.State.data.fx.crackle / 100) * 0.16) {
        A.crackle.env.triggerAttackRelease(0.01, time);
      }
    }, '32n');
  }

  /* ------------------------------------------------------------ lifecycle */
  function ensure() {
    if (A.ready) return Promise.resolve(true);
    if (A.building) return A.building;
    A.building = (async function () {
      try {
        await loadTone();
        /* a slightly longer look-ahead than the 100 ms default: this app
           schedules a lot of short notes and a bigger buffer is the cheapest
           insurance against dropouts on a slow phone. */
        Tone.getContext().lookAhead = 0.12;
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
    A.fx.tape.distortion = (v / 100) * 0.3;
    A.fx.tape.wet.value = v / 100;
  }
  function setCrackle(v) { if (A.ready) A.crackle.gain.gain.value = (v / 100) * 0.10; }
  function setReverb(v) { if (A.ready) A.fx.reverbWet.gain.value = v / 100; }
  function setChorus(v) { if (A.ready) A.fx.chorus.wet.value = v / 100; }
  function setWow(v) {
    if (!A.ready) return;
    A.fx.wow.depth.value = v / 100;
    A.fx.wow.wet.value = v / 100;
  }
  function setTrackVol(id, v) { if (A.ready && A.ch[id]) A.ch[id].volume.value = db(v); }
  function setTrackPan(id, v) { if (A.ready && A.ch[id]) A.ch[id].pan.value = Math.max(-1, Math.min(1, v / 100)); }
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
      setTrackPan(t, S.tracks[t].pan);
      setTrackMute(t, S.tracks[t].mute);
      setTrackSolo(t, S.tracks[t].solo);
    });
  }

  /* ------------------------------------------------------------ transport */
  function scheduleSequence(countIn) {
    clearSequence();
    A.step = -1;
    A.bar = -1;
    resetSong();
    var startAt = countIn ? '+1m' : 0;
    A.countingIn = !!countIn;
    A.seqId = Tone.Transport.scheduleRepeat(function (time) {
      var i = (A.step + 1) % LS.STEP_COUNT;
      A.step = i;
      if (i === 0) A.countingIn = false;
      if (i === 0) {
        A.bar = (A.bar + 1) % 4;
        advanceSong();
      }

      var at = time;
      var swing = LS.State.data.swing;
      if (i % 2 === 1 && swing > 0) {
        at = time + Tone.Time('16n').toSeconds() * (swing / 100) * 0.5;
      }

      triggerStep(i, A.bar, at);

      Tone.Draw.schedule(function () {
        if (LS.UI && LS.UI.highlight) LS.UI.highlight(i);
      }, time);
    }, '16n', startAt);
  }

  /* Song mode: each slot plays for its own bar count, then the next filled
     slot takes over. The slot's step array becomes the live pattern, so an
     edit made while it plays is written into that slot — which is what you
     want when you are arranging. */
  function advanceSong() {
    var S = LS.State.data;
    if (!S.song || !S.song.on) { A.songBar = 0; return; }
    var filled = S.song.slots.map(function (sl, idx) { return sl ? idx : -1; })
      .filter(function (idx) { return idx >= 0; });
    if (!filled.length) return;

    if (A.slot === null || filled.indexOf(A.slot) < 0) {
      A.slot = filled[0];
      A.songBar = 1;                 // the bar that just started is its first
      if (LS.App && LS.App.enterSlot) LS.App.enterSlot(A.slot, true);
      return;
    }

    var slot = S.song.slots[A.slot];
    var bars = (slot && slot.bars) || 2;
    if (A.songBar >= bars) {
      var next = filled[(filled.indexOf(A.slot) + 1) % filled.length];
      A.slot = next;
      A.songBar = 1;
      if (LS.App && LS.App.enterSlot) LS.App.enterSlot(next, false);
    } else {
      A.songBar++;
    }
  }

  function resetSong() { A.slot = null; A.songBar = 0; }

  function clearSequence() {
    if (typeof Tone === 'undefined') return;
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
      var v = S.steps[id][i];
      if (!v) continue;
      var vel = velFor(v);

      try {
        if (id === 'kick') {
          A.inst.kick.triggerAttackRelease('C1', '8n', time, vel);
        } else if (id === 'snare') {
          A.snareNoise.triggerAttackRelease('16n', time, vel);
          A.snareTone.triggerAttackRelease('A2', '16n', time, vel * 0.7);
        } else if (id === 'hat') {
          A.inst.hat.triggerAttackRelease('32n', time, i % 4 === 0 ? vel : vel * 0.62);
        } else if (id === 'bass') {
          A.inst.bass.triggerAttackRelease(LS.octave(chord[0], -1), '8n', time, vel);
        } else if (id === 'keys') {
          A.inst.keys.triggerAttackRelease(chord, '2n', time, vel * 0.8);
        } else if (id === 'melody') {
          A.inst.melody.triggerAttackRelease(LS.octave(chord[i % chord.length], 1), '16n', time, vel * 0.9);
        }
      } catch (e) {
        console.warn('[Lofi] trigger failed', id, e);
      }
    }

    if (S.autoFill && bar === 3 && i >= 12 && !S.tracks.snare.mute) {
      try {
        A.snareNoise.triggerAttackRelease('32n', time, 0.35 + (i - 12) * 0.1);
      } catch (e) {}
    }
  }

  /* Audition a voice when a pad is switched on — but only while stopped, so
     it never doubles a note that the sequencer is about to play anyway. */
  var VOICES = ['kick', 'snare', 'hat', 'bass', 'keys', 'melody'];
  function audition(id) {
    if (!A.ready || VOICES.indexOf(id) < 0 || A.transportStarted) return;
    var S = LS.State.data;
    var chord = (LS.VIBES[S.vibe] || LS.VIBES.jazz).chords[0];
    var now = Tone.now() + 0.03;
    try {
      if (id === 'kick') A.inst.kick.triggerAttackRelease('C1', '8n', now, 0.8);
      else if (id === 'snare') {
        A.snareNoise.triggerAttackRelease('16n', now, 0.8);
        A.snareTone.triggerAttackRelease('A2', '16n', now, 0.5);
      } else if (id === 'hat') A.inst.hat.triggerAttackRelease('32n', now, 0.8);
      else if (id === 'bass') A.inst.bass.triggerAttackRelease(LS.octave(chord[0], -1), '8n', now, 0.8);
      else if (id === 'keys') A.inst.keys.triggerAttackRelease(chord, '8n', now, 0.7);
      else if (id === 'melody') A.inst.melody.triggerAttackRelease(LS.octave(chord[2] || chord[0], 1), '8n', now, 0.7);
    } catch (e) {}
  }

  /* A 30 ms ramp in and a 45 ms ramp out. Without these, starting or stopping
     the transport cuts a waveform mid-cycle and you hear a click. */
  function fadeIn() {
    if (!A.ready) return;
    var now = Tone.now();
    A.fader.gain.cancelScheduledValues(now);
    A.fader.gain.setValueAtTime(0.0001, now);
    A.fader.gain.linearRampToValueAtTime(1, now + 0.03);
  }
  function fadeOut(done) {
    if (!A.ready) { if (done) done(); return; }
    var now = Tone.now();
    A.fader.gain.cancelScheduledValues(now);
    A.fader.gain.setValueAtTime(A.fader.gain.value, now);
    A.fader.gain.linearRampToValueAtTime(0.0001, now + 0.045);
    if (done) setTimeout(done, 60);
  }

  function startTransport() {
    if (typeof Tone === 'undefined') return;
    Tone.Transport.bpm.value = LS.State.data.bpm;
    fadeIn();
    if (Tone.Transport.state !== 'started') Tone.Transport.start();
    A.transportStarted = true;
  }
  function stopTransport() {
    if (typeof Tone === 'undefined') return;
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
      var env = new Tone.AmplitudeEnvelope({ attack: 0.002, decay: 0.05, sustain: 0, release: 0.02 }).connect(out);
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
        frequency: 800, envelope: { attack: 0.002, decay: 0.15, release: 0.05 },
        harmonicity: 8, modulationIndex: 20, resonance: 3000, octaves: 1
      }).connect(out);
      clink.volume.value = -22;
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
      synth.volume.value = -14;
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
      var cricket = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.002, decay: 0.02, sustain: 0.3, release: 0.02 } }).connect(out);
      cricket.volume.value = -26;
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
    var vol = new Tone.Gain((LS.State.data.amb[id].vol / 100) * 0.75).connect(A.mixBus);
    A.amb[id] = { gain: vol, teardown: builders[id](vol) };
  }
  function ambienceOff(id) {
    var e = A.amb[id];
    if (!e) return;
    try { e.teardown(); } catch (err) { console.warn('[Lofi] ambience teardown', id, err); }
    try { e.gain.dispose(); } catch (err) {}
    delete A.amb[id];
  }
  function ambienceVol(id, v) { if (A.amb[id]) A.amb[id].gain.gain.value = (v / 100) * 0.75; }
  function ambienceCount() { return Object.keys(A.amb).length; }
  function isAmbienceOn(id) { return !!A.amb[id]; }

  /* ------------------------------------------------------------- recorder */
  function canRecord() {
    return A.ready && typeof Tone.Recorder !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined';
  }
  async function recordStart() {
    if (!canRecord()) throw new Error('Recording is not supported in this browser');
    if (!A.recorder) {
      A.recorder = new Tone.Recorder();
      A.master.connect(A.recorder);
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
      if (A.inst.melody && A.inst.melody.releaseAll) A.inst.melody.releaseAll();
      Object.keys(A.amb).forEach(ambienceOff);
      if (A.fader) {
        var now = Tone.now();
        A.fader.gain.cancelScheduledValues(now);
        A.fader.gain.setValueAtTime(A.fader.gain.value, now);
        A.fader.gain.linearRampToValueAtTime(0.0001, now + 0.04);
        setTimeout(function () {
          try { A.fader.gain.setValueAtTime(1, Tone.now()); } catch (e) {}
        }, 260);
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
      ['kick', 'hat', 'bass', 'keys', 'melody', 'snareNoise', 'snareTone'].forEach(function (k) {
        var n = A.inst[k] || A[k];
        if (n) { try { n.dispose(); } catch (e) {} }
      });
      Object.keys(A.ch).forEach(function (k) { try { A.ch[k].dispose(); } catch (e) {} });
      Object.keys(A.fx).forEach(function (k) { try { A.fx[k].dispose(); } catch (e) {} });
      ['gain', 'env', 'filter', 'noise', 'hiss', 'hissHP', 'hissLP'].forEach(function (k) {
        if (A.crackle[k]) { try { A.crackle[k].dispose(); } catch (e) {} }
      });
      ['hatBell', 'hatHP', 'snareBand'].forEach(function (k) {
        if (A[k]) { try { A[k].dispose(); } catch (e) {} }
      });
      ['analyser', 'master', 'fader', 'limiter', 'comp', 'mixBus'].forEach(function (k) {
        if (A[k]) { try { A[k].dispose(); } catch (e) {} }
      });
    } catch (e) {
      console.warn('[Lofi] dispose', e);
    }
  }

  LS.Audio = {
    ensure: ensure,
    loadTone: loadTone,
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
    setTrackPan: setTrackPan,
    setTrackMute: setTrackMute,
    setTrackSolo: setTrackSolo,
    setViz: setViz,
    setBpm: setBpm,
    scheduleSequence: scheduleSequence,
    clearSequence: clearSequence,
    startTransport: startTransport,
    stopTransport: stopTransport,
    fadeOut: fadeOut,
    audition: audition,
    ambienceOn: ambienceOn,
    ambienceOff: ambienceOff,
    ambienceVol: ambienceVol,
    ambienceCount: ambienceCount,
    isAmbienceOn: isAmbienceOn,
    canRecord: canRecord,
    recordStart: recordStart,
    recordStop: recordStop,
    panic: panic,
    dispose: dispose,
    position: function () { return { step: A.step, bar: A.bar, slot: A.slot, songBar: A.songBar }; }
  };
})(window.LS = window.LS || {});
