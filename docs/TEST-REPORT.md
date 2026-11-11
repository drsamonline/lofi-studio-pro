# Browser test report

**88 of 88 checks passing.** Run in headless Chromium against the real app (not a mock), driving the DOM the way a person would: clicking, holding, dragging, typing, reloading and going offline.

Regenerate with `python3 tests/run_browser_tests.py`.

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | boot: Tone.js loaded from vendor/ | PASS | 14.8.49 |
| 2 | boot: no console errors | PASS |  |
| 3 | boot: loader removed | PASS |  |
| 4 | boot: 96 step pads rendered | PASS |  |
| 5 | boot: 6 presets / 10 patterns / 12 vibes | PASS | 6/10/12 |
| 6 | boot: 10 themes / 9 ambience / 6 faders / 6 fx knobs | PASS |  |
| 7 | boot: defaults applied | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 8 | transport: play starts Tone.Transport | PASS | started |
| 9 | transport: play button enters playing state | PASS |  |
| 10 | transport: playhead moves across pads | PASS | 6 |
| 11 | transport: bar.beat readout updates | PASS | 3·1 |
| 12 | tempo: + button raises BPM and engine | PASS | 80.99999999999999 |
| 13 | tempo: clamps at 60 | PASS | 60 |
| 14 | tempo: clamps at 160 | PASS | 160 |
| 15 | tempo: tap tempo matches the tapped interval | PASS | got 115, intervals imply 115 |
| 16 | transport: stop halts transport when no ambience | PASS | stopped |
| 17 | swing: keyboard adjusts swing state | PASS | 41 |
| 18 | pads: clicking toggles a step in state | PASS | 1 |
| 19 | pads: aria-pressed follows | PASS |  |
| 20 | pads: editing marks the pattern custom | PASS | Custom |
| 21 | pads: clicking again clears the step | PASS |  |
| 22 | patterns: loading a pattern fills 16 steps per track | PASS | {"id":"trap","hat":11} |
| 23 | pads: arrow key moves focus to next step | PASS | 1 |
| 24 | mixer: mute updates state and both controls | PASS |  |
| 25 | mixer: solo updates state | PASS |  |
| 26 | mixer: fader keyboard changes track volume | PASS | 34 |
| 27 | velocity: holding a pad raises it to an accent | PASS | 2 |
| 28 | velocity: holding again makes it a ghost | PASS | 3 |
| 29 | velocity: a plain tap still clears the step | PASS | 0 |
| 30 | share: a pattern encodes to 48 hex characters | PASS | 000404000040004044414441400404004000400001000104 |
| 31 | share: encode/decode round-trips exactly | PASS | [0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0] |
| 32 | share: a link rebuilds the pattern and tempo | PASS | {"bpm":97,"vibe":"dark","on":20} |
| 33 | share: loading a link raises no console errors | PASS |  |
| 34 | sleep timer: cycles off to 15 minutes | PASS | 15 min |
| 35 | sleep timer: cycles on to 30 | PASS |  |
| 36 | media session: metadata set while playing | PASS |  |
| 37 | audio: loud pattern peaks below full scale with headroom | PASS | {"peak":0.609,"rms":0.109,"crest":5.6,"clip":0} |
| 38 | audio: crest factor stays musical (not squashed) | PASS | {"peak":0.609,"rms":0.109,"crest":5.6,"clip":0} |
| 39 | audio: the capture actually contains the beat | PASS | {"peak":0.609,"rms":0.109,"crest":5.6,"clip":0} |
| 40 | fx: all six knobs respond and write state | PASS | {"filter":166,"tape":51,"crackle":51,"reverb":51,"chorus":51,"wow":51} |
| 41 | fx: filter value reached the Tone.Filter | PASS |  |
| 42 | themes: ten themes, nine distinct accents (black reuses the red) | PASS | 9 distinct |
| 43 | themes: meta theme-color follows the theme | PASS | 10 distinct |
| 44 | themes: every theme defines bg and accent | PASS |  |
| 45 | presets: Sleep applies tempo, pattern and chords | PASS | {"bpm":60,"p":"ambient","v":"dreamy"} |
| 46 | presets: applying a preset starts playback | PASS |  |
| 47 | presets: filter knob followed the preset | PASS | 2200 |
| 48 | surprise: changes pattern, theme and tempo | PASS | {"p": "synthwave", "t": "cyberpunk", "b": 94} |
| 49 | surprise: keeps playing (regression from 1.0) | PASS | started |
| 50 | surprise: still playing 3s later | PASS |  |
| 51 | views: ambience view becomes visible | PASS |  |
| 52 | ambience: rain toggles on and creates a layer | PASS |  |
| 53 | ambience: transport runs for ambience with beat stopped | PASS |  |
| 54 | ambience: volume slider writes state | PASS |  |
| 55 | ambience: toggling off disposes the layer | PASS |  |
| 56 | settings: auto-save toggles off | PASS |  |
| 57 | settings: auto-fill toggles | PASS |  |
| 58 | settings: visualiser switches to spectrum | PASS | bars |
| 59 | settings: debug toggles | PASS |  |
| 60 | recording: starts and stops a take | PASS | {"started":true,"ended":false} |
| 61 | reset: returns every value to defaults | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 62 | persistence: state written to localStorage | PASS | {"v":2,"bpm":104,"swing":10,"master":80,"patternId":"dub","s |
| 63 | persistence: survives a reload | PASS | {"bpm":104,"t":"ocean","p":"dub"} |
| 64 | persistence: reload raises no console errors | PASS |  |
| 65 | robustness: corrupt save falls back to defaults without crashing | PASS | pads=96 theme=purple |
| 66 | robustness: out-of-range values are clamped | PASS | {"vol":100,"filter":400} |
| 67 | robustness: no console errors on a bad save | PASS |  |
| 68 | migration: a v1 save is carried over | PASS | {"bpm":77,"t":"forest","v":"sad","vol":60} |
| 69 | migration: old key removed, no console errors | PASS |  |
| 70 | pwa: service worker controls the page | PASS |  |
| 71 | pwa: manifest is valid json with icons | PASS |  |
| 72 | pwa: shell precached (>=12 entries) | PASS | 14 |
| 73 | layout 360px: no horizontal page overflow | PASS | 0 |
| 74 | layout 360px: bottom tab bar shown, rail hidden | PASS | tabs=grid rail=none |
| 75 | layout 360px: pads stay tappable (>=40px) | PASS | 40x40 |
| 76 | layout 360px: sequencer scrolls instead of shrinking | PASS |  |
| 77 | layout 360px: transport bar present | PASS |  |
| 78 | layout 768px: rail replaces the tab bar | PASS | tabs=none rail=flex |
| 79 | layout 768px: no page overflow | PASS | 0 |
| 80 | layout 1280px: no page overflow | PASS | 0 |
| 81 | layout 1280px: sequencer fits without scrolling | PASS |  |
| 82 | layout 1280px: pads are at least 44x40 | PASS | 58.7x45.1 |
| 83 | layout: no target below the 24px WCAG minimum | PASS | [] |
| 84 | layout: track labels stay pinned while the grid scrolls | PASS | {"headLeft": 25, "padLeft": -192, "scrollLeft": 300} |
| 85 | offline: app opens with the server down | PASS | Lofi Studio Pro — a lofi beat machine in your browser |
| 86 | offline: Tone.js loads from cache | PASS |  |
| 87 | offline: sequencer renders offline | PASS |  |
| 88 | offline: no console errors offline | PASS |  |

## What is covered

- **Boot** — Tone.js loads from `vendor/`, no console errors, 96 pads, 6 presets, 10 patterns, 12 chord sets, 10 themes, 9 ambience layers, 6 faders, 6 knobs.
- **Transport** — play starts the Tone transport, the playhead walks the grid, the bar·beat readout advances, stop halts it, tempo clamps at 60 and 160, tap tempo matches the tapped interval.
- **Sequencer** — pad toggles write state and aria, editing marks the pattern custom, patterns load 16 steps per track, arrow keys move focus.
- **Velocity** — holding a pad raises it to an accent, holding again makes it a ghost, a plain tap still clears it.
- **Mixer** — mute and solo stay in sync between the sequencer heads and the mixer strips, faders respond to keyboard and pointer.
- **FX** — all six knobs write state and reach the Tone nodes.
- **Themes** — all ten apply, the meta theme-color follows, every theme defines a background and accent.
- **Presets and Surprise** — a preset sets tempo, pattern, chords and FX and starts playback; Surprise changes pattern, theme and tempo and **keeps playing**.
- **Ambience** — toggles create and dispose layers, the transport runs for ambience with the beat stopped, volume writes through.
- **Sharing** — a pattern encodes to 48 hex characters, round-trips exactly, and a link rebuilds the pattern, tempo and chords on load.
- **Sleep timer and media session** — the timer cycles through its intervals and writes state; lock-screen metadata is set while playing.
- **Audio** — a loud pattern at full master peaks below full scale, clips zero samples, and keeps a musical crest factor.
- **Settings and reset** — every switch works; reset returns the state to defaults exactly.
- **Persistence** — survives a reload; a corrupted save falls back to defaults; out-of-range values are clamped; a v1 save is migrated and the old key removed.
- **PWA** — service worker controls the page, the manifest parses with icons and screenshots, 14 shell entries are precached.
- **Layout** — no horizontal overflow at 360 / 768 / 1280 px, tab bar below 720 and rail above, pads 40–59 px, nothing below the 24 px WCAG target minimum, track labels stay pinned while the grid scrolls.
- **Offline** — with the origin server stopped, the app still opens, Tone.js loads from cache, the sequencer renders, and the console stays clean.
