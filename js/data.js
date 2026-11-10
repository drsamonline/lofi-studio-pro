/* =============================================================================
   Lofi Studio Pro — data.js
   Static musical data: tracks, patterns, chord progressions, themes, presets.
   Everything here is pure data; no DOM, no audio.
   ========================================================================== */
(function (LS) {
  'use strict';

  LS.STEP_COUNT = 16;

  LS.TRACK_IDS = ['kick', 'snare', 'hat', 'bass', 'keys', 'melody'];

  LS.TRACKS = {
    kick:   { label: 'Kick',   short: 'KIK', color: '#ff4d6d' },
    snare:  { label: 'Snare',  short: 'SNR', color: '#ffb703' },
    hat:    { label: 'Hat',    short: 'HAT', color: '#4ade80' },
    bass:   { label: 'Bass',   short: 'BAS', color: '#a78bfa' },
    keys:   { label: 'Keys',   short: 'KEY', color: '#38bdf8' },
    melody: { label: 'Melody', short: 'MEL', color: '#f472b6' }
  };

  function mk(indices) {
    var a = new Array(LS.STEP_COUNT).fill(0);
    indices.forEach(function (i) { a[i] = 1; });
    return a;
  }
  LS.mk = mk;

  LS.PATTERNS = {
    chillhop:  { name: 'Chill Hop',  steps: { kick: mk([0,6,10]), snare: mk([4,12]), hat: mk([0,2,4,7,8,10,12,15]), bass: mk([0,6,10]), keys: mk([0,8]), melody: mk([3,11,14]) } },
    jazz:      { name: 'Jazz',       steps: { kick: mk([0,10]), snare: mk([4,7,12]), hat: mk([0,2,3,6,8,10,11,14]), bass: mk([0,3,6,9,12,14]), keys: mk([2,6,9,13]), melody: mk([1,5,9,13]) } },
    trap:      { name: 'Trap',       steps: { kick: mk([0,7,10]), snare: mk([8]), hat: mk([0,2,4,6,7,8,9,10,12,14,15]), bass: mk([0,7,10]), keys: mk([0]), melody: mk([3,11]) } },
    boombap:   { name: 'Boom Bap',   steps: { kick: mk([0,3,10]), snare: mk([4,12]), hat: mk([0,2,4,6,8,10,12,14]), bass: mk([0,3,10]), keys: mk([0,8]), melody: mk([6,14]) } },
    ambient:   { name: 'Ambient',    steps: { kick: mk([0]), snare: mk([]), hat: mk([4,12]), bass: mk([0]), keys: mk([0,4,8,12]), melody: mk([2,9]) } },
    synthwave: { name: 'Synthwave',  steps: { kick: mk([0,4,8,12]), snare: mk([4,12]), hat: mk([0,2,4,6,8,10,12,14]), bass: mk([0,4,8,12]), keys: mk([0,8]), melody: mk([0,2,4,6,8,10,12,14]) } },
    downtempo: { name: 'Downtempo',  steps: { kick: mk([0,9]), snare: mk([6,14]), hat: mk([2,6,10,14]), bass: mk([0,9]), keys: mk([0,8]), melody: mk([5,13]) } },
    house:     { name: 'House',      steps: { kick: mk([0,4,8,12]), snare: mk([4,12]), hat: mk([2,6,10,14]), bass: mk([2,6,10,14]), keys: mk([0,4,8,12]), melody: mk([3,7,11,15]) } },
    dub:       { name: 'Dub',        steps: { kick: mk([8]), snare: mk([8]), hat: mk([4,12]), bass: mk([0,7,10]), keys: mk([2,6,10,14]), melody: mk([10]) } },
    minimal:   { name: 'Minimal',    steps: { kick: mk([0]), snare: mk([]), hat: mk([8]), bass: mk([0]), keys: mk([0]), melody: mk([12]) } }
  };

  LS.PATTERN_ORDER = ['chillhop','jazz','trap','boombap','ambient','synthwave','downtempo','house','dub','minimal'];

  LS.VIBES = {
    jazz:        { name: 'Jazz',        chords: [['D3','F3','A3','C4'], ['G3','B3','D4','F4'], ['C4','E4','G4','B4'], ['A3','C4','E4','G4']] },
    sad:         { name: 'Sad',         chords: [['A3','C4','E4','G4'], ['D3','F3','A3','C4'], ['E3','G3','B3','D4'], ['A3','C4','E4','G4']] },
    hopeful:     { name: 'Hopeful',     chords: [['C4','E4','G4','B4'], ['G3','B3','D4','F#4'], ['A3','C4','E4','G4'], ['F3','A3','C4','E4']] },
    dark:        { name: 'Dark',        chords: [['D3','F3','A3','C4'], ['A#2','D3','F3','A3'], ['C3','E3','G3','A#3'], ['D3','F3','A3','C4']] },
    dreamy:      { name: 'Dreamy',      chords: [['F3','A3','C4','E4'], ['E3','G#3','B3','D#4'], ['A3','C#4','E4','G#4'], ['D3','F#3','A3','C#4']] },
    nostalgic:   { name: 'Nostalgic',   chords: [['A3','C4','E4','G4'], ['F3','A3','C4','E4'], ['C4','E4','G4','B4'], ['G3','B3','D4','F4']] },
    uplifting:   { name: 'Uplifting',   chords: [['G3','B3','D4','F#4'], ['C4','E4','G4','B4'], ['D3','F#3','A3','C4'], ['G3','B3','D4','F#4']] },
    melancholic: { name: 'Melancholic', chords: [['E3','G3','B3','D4'], ['B2','D3','F#3','A3'], ['C3','E3','G3','B3'], ['G3','B3','D4','F#4']] },
    blues:       { name: 'Blues',       chords: [['A3','C#4','E4','G4'], ['D3','F#3','A3','C4'], ['A3','C#4','E4','G4'], ['E3','G#3','B3','D4']] },
    classical:   { name: 'Classical',   chords: [['C4','E4','G4'], ['F3','A3','C4'], ['G3','B3','D4'], ['C4','E4','G4']] },
    ethereal:    { name: 'Ethereal',    chords: [['C4','D4','G4'], ['G3','C4','D4'], ['A3','B3','E4'], ['F3','G3','C4']] },
    tropical:    { name: 'Tropical',    chords: [['D4','F#4','A4','C#5'], ['B3','D4','F#4','A4'], ['G3','B3','D4','F#4'], ['A3','C#4','E4','G4']] }
  };
  LS.VIBE_ORDER = ['jazz','sad','hopeful','dark','dreamy','nostalgic','uplifting','melancholic','blues','classical','ethereal','tropical'];

  LS.THEMES = [
    { id: 'purple',    name: 'Purple',    acc: '#e94560', acc2: '#533483', bg: '#12101a', panel: '#1a1727' },
    { id: 'pink',      name: 'Pink',      acc: '#ff6b9d', acc2: '#c73e6c', bg: '#1a0f16', panel: '#241521' },
    { id: 'black',     name: 'Black',     acc: '#e94560', acc2: '#7a1f30', bg: '#08080a', panel: '#131316' },
    { id: 'bright',    name: 'Bright',    acc: '#6d4fc4', acc2: '#e94560', bg: '#efecf6', panel: '#f9f7fd', light: true },
    { id: 'ocean',     name: 'Ocean',     acc: '#00d68f', acc2: '#1e8fa6', bg: '#04121b', panel: '#0a1d29' },
    { id: 'forest',    name: 'Forest',    acc: '#4ade80', acc2: '#2f7a4a', bg: '#081209', panel: '#0f1f14' },
    { id: 'sunset',    name: 'Sunset',    acc: '#ffaa00', acc2: '#e94560', bg: '#1c0f1e', panel: '#2a1730' },
    { id: 'midnight',  name: 'Midnight',  acc: '#4361ee', acc2: '#3a0ca3', bg: '#040a18', panel: '#0a1226' },
    { id: 'lavender',  name: 'Lavender',  acc: '#7c4dff', acc2: '#c68fff', bg: '#eae4f8', panel: '#f7f3ff', light: true },
    { id: 'cyberpunk', name: 'Cyberpunk', acc: '#ff2079', acc2: '#00f0ff', bg: '#0a0113', panel: '#150523' }
  ];
  LS.THEME_IDS = LS.THEMES.map(function (t) { return t.id; });

  /* Inline SVG rather than emoji: emoji coverage varies by platform and a
     missing glyph shows up as a box in the middle of the interface. */
  var ICONS = {
    rain:      '<path d="M4 12a3.6 3.6 0 0 1 .6-7.1A5 5 0 0 1 14.5 5 3.6 3.6 0 0 1 16 12"/><path d="M8 15.5v2M12 17v2M16 15.5v2"/>',
    fireplace: '<path d="M12 3c3 4.2 5 5.8 5 9.2A5 5 0 0 1 7 12.2c0-2 1-3.2 2.2-4.2 0 2 .8 3 1.8 3 0-3 0-5.2 1-8z"/>',
    cafe:      '<path d="M5 8h10v5a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5z"/><path d="M15 9h2.2a2 2 0 0 1 0 4H15"/><path d="M4 21h12"/>',
    wind:      '<path d="M3 9h9a2.4 2.4 0 1 0-2.4-2.4"/><path d="M3 14h12a2.4 2.4 0 1 1-2.4 2.4"/><path d="M3 19h5"/>',
    birds:     '<path d="M3 15c2-3.5 4-3.5 6 0"/><path d="M13 11c2-3.5 4-3.5 6 0"/><path d="M9 7c1.4-2.2 2.8-2.2 4.2 0"/>',
    thunder:   '<path d="M13 2.5 6.5 13H11l-1 8.5L17.5 11H13z"/>',
    ocean:     '<path d="M3 10c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/><path d="M3 16c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/>',
    night:     '<path d="M20 14.5A8.2 8.2 0 1 1 10.2 4a6.6 6.6 0 0 0 9.8 10.5z"/>',
    vinyl:     '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.6"/><path d="M12 3.5v2M12 18.5v2"/>'
  };

  LS.AMBIENCE = [
    { id: 'rain',      name: 'Rain',      svg: ICONS.rain },
    { id: 'fireplace', name: 'Fireplace', svg: ICONS.fireplace },
    { id: 'cafe',      name: 'Cafe',      svg: ICONS.cafe },
    { id: 'wind',      name: 'Wind',      svg: ICONS.wind },
    { id: 'birds',     name: 'Birds',     svg: ICONS.birds },
    { id: 'thunder',   name: 'Thunder',   svg: ICONS.thunder },
    { id: 'ocean',     name: 'Ocean',     svg: ICONS.ocean },
    { id: 'night',     name: 'Night',     svg: ICONS.night },
    { id: 'vinyl',     name: 'Vinyl',     svg: ICONS.vinyl }
  ];
  LS.AMBIENCE_IDS = LS.AMBIENCE.map(function (a) { return a.id; });

  LS.PRESETS = {
    work:     { name: 'Work',     icon: '💼', bpm: 85, pattern: 'boombap',  vibe: 'hopeful',   swing: 10, filter: 6500, reverb: 25, crackle: 10, tape: 15 },
    play:     { name: 'Play',     icon: '🎮', bpm: 96, pattern: 'house',    vibe: 'uplifting', swing: 8,  filter: 8500, reverb: 20, crackle: 5,  tape: 10 },
    focus:    { name: 'Focus',    icon: '🎯', bpm: 70, pattern: 'minimal',  vibe: 'ethereal',  swing: 5,  filter: 4200, reverb: 35, crackle: 15, tape: 20 },
    sleep:    { name: 'Sleep',    icon: '😴', bpm: 60, pattern: 'ambient',  vibe: 'dreamy',    swing: 0,  filter: 2200, reverb: 60, crackle: 20, tape: 25 },
    study:    { name: 'Study',    icon: '📚', bpm: 75, pattern: 'chillhop', vibe: 'nostalgic', swing: 12, filter: 5200, reverb: 30, crackle: 25, tape: 20 },
    meditate: { name: 'Meditate', icon: '🧘', bpm: 62, pattern: 'ambient',  vibe: 'ethereal',  swing: 0,  filter: 2800, reverb: 70, crackle: 8,  tape: 15 }
  };
  LS.PRESET_ORDER = ['work','play','focus','sleep','study','meditate'];

  /* Octave helpers work on Tone.js note names ("C4"). */
  LS.octave = function (note, delta) {
    var m = /^([A-G]#?)(-?\d+)$/.exec(note);
    if (!m) return note;
    return m[1] + (parseInt(m[2], 10) + delta);
  };
})(window.LS = window.LS || {});
