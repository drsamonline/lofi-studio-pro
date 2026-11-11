/* =============================================================================
   Lofi Studio Pro — midi.js
   A Standard MIDI File writer. Four bars of the current pattern, drums on
   channel 10, bass/keys/melody on channels 1–3, so it opens in any DAW with
   the parts already separated.

   Format 0, one track, 96 ticks per quarter note: a sixteenth step is 24 ticks,
   which divides cleanly by the swing the app applies.
   ========================================================================== */
(function (LS) {
  'use strict';

  var TPQ = 96;
  var STEP_TICKS = TPQ / 4;          // 24
  var BARS = 4;
  var STEPS = LS.STEP_COUNT * BARS;  // 96

  var NOTE_BASE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

  function noteToMidi(name) {
    var m = /^([A-G]#?)(-?\d+)$/.exec(name);
    if (!m) return 60;
    return NOTE_BASE[m[1]] + (parseInt(m[2], 10) + 1) * 12;
  }

  function velocity(v) {
    if (v === 3) return 64;   // ghost
    if (v === 2) return 120;  // accent
    return 96;                // normal
  }

  /* Variable-length quantity: 7 bits per byte, high bit set on all but the last. */
  function vlq(value) {
    var bytes = [value & 0x7f];
    value >>= 7;
    while (value > 0) {
      bytes.unshift((value & 0x7f) | 0x80);
      value >>= 7;
    }
    return bytes;
  }

  function str(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function uint32(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; }
  function uint16(n) { return [(n >>> 8) & 255, n & 255]; }

  /* Collects {tick, note, vel, dur, ch} then sorts and writes. */
  function build(data) {
    var vibe = LS.VIBES[data.vibe] || LS.VIBES.jazz;
    var events = [];

    function add(ch, note, tick, vel, dur) {
      if (note < 0 || note > 127) return;
      events.push({ tick: tick, ch: ch, note: note, vel: vel, dur: dur });
    }

    for (var step = 0; step < STEPS; step++) {
      var i = step % LS.STEP_COUNT;
      var bar = Math.floor(step / LS.STEP_COUNT) % vibe.chords.length;
      var chord = vibe.chords[bar];
      var tick = step * STEP_TICKS;

      var k = data.steps.kick[i];
      if (k) add(9, 36, tick, velocity(k), STEP_TICKS * 2);

      var s = data.steps.snare[i];
      if (s) add(9, 38, tick, velocity(s), STEP_TICKS * 2);

      var h = data.steps.hat[i];
      if (h) add(9, 42, tick, Math.round(velocity(h) * 0.7), Math.round(STEP_TICKS * 0.6));

      var b = data.steps.bass[i];
      if (b) add(0, noteToMidi(chord[0]) - 12, tick, velocity(b), STEP_TICKS * 2);

      var ky = data.steps.keys[i];
      if (ky) {
        chord.forEach(function (n) { add(1, noteToMidi(n), tick, Math.round(velocity(ky) * 0.8), STEP_TICKS * 8); });
      }

      var m = data.steps.melody[i];
      if (m) add(2, noteToMidi(chord[i % chord.length]) + 12, tick, Math.round(velocity(m) * 0.9), STEP_TICKS);
    }

    events.sort(function (a, b) { return a.tick - b.tick || a.ch - b.ch; });

    /* Turn each note into an on and an off, then sort again so overlapping
       notes are written in the right order. */
    var flat = [];
    events.forEach(function (e) {
      flat.push({ t: e.tick, kind: 1, ch: e.ch, note: e.note, vel: e.vel });
      flat.push({ t: e.tick + Math.max(1, e.dur), kind: 0, ch: e.ch, note: e.note, vel: 0 });
    });
    flat.sort(function (a, b) { return a.t - b.t || a.kind - b.kind; });

    var track = [];
    var last = 0;
    flat.forEach(function (e) {
      var delta = e.t - last;
      last = e.t;
      track = track.concat(vlq(delta), [(e.kind ? 0x90 : 0x80) | e.ch, e.note & 127, e.vel & 127]);
    });

    /* end of track */
    track = track.concat(vlq(Math.max(1, STEPS * STEP_TICKS - last)), [0xff, 0x2f, 0x00]);

    var header = [].concat(str('MThd'), uint32(6), uint16(0), uint16(1), uint16(TPQ));
    var chunk = [].concat(str('MTrk'), uint32(track.length), track);
    return new Uint8Array(header.concat(chunk));
  }

  LS.MIDI = { build: build, noteToMidi: noteToMidi };
})(window.LS = window.LS || {});
