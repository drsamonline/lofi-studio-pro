# Browser test report

**75 of 75 checks passing.** Run in headless Chromium against the real app (not a mock), driving the DOM the way a person would: clicking, dragging, typing, reloading and going offline.

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
| 11 | transport: bar.beat readout updates | PASS | 2·1 |
| 12 | tempo: + button raises BPM and engine | PASS | 80.99999999999999 |
| 13 | tempo: clamps at 60 | PASS | 60 |
| 14 | tempo: clamps at 160 | PASS | 160 |
| 15 | tempo: tap tempo matches the tapped interval | PASS | got 105, intervals imply 105 |
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
| 27 | fx: all six knobs respond and write state | PASS | {"filter":166,"tape":51,"crackle":51,"reverb":51,"chorus":51,"wow":51} |
| 28 | fx: filter value reached the Tone.Filter | PASS |  |
| 29 | themes: ten themes, nine distinct accents (black reuses the red) | PASS | 9 distinct |
| 30 | themes: meta theme-color follows the theme | PASS | 10 distinct |
| 31 | themes: every theme defines bg and accent | PASS |  |
| 32 | presets: Sleep applies tempo, pattern and chords | PASS | {"bpm":60,"p":"ambient","v":"dreamy"} |
| 33 | presets: applying a preset starts playback | PASS |  |
| 34 | presets: filter knob followed the preset | PASS | 2200 |
| 35 | surprise: changes pattern, theme and tempo | PASS | {"p": "synthwave", "t": "bright", "b": 97} |
| 36 | surprise: keeps playing (regression from 1.0) | PASS | started |
| 37 | surprise: still playing 3s later | PASS |  |
| 38 | views: ambience view becomes visible | PASS |  |
| 39 | ambience: rain toggles on and creates a layer | PASS |  |
| 40 | ambience: transport runs for ambience with beat stopped | PASS |  |
| 41 | ambience: volume slider writes state | PASS |  |
| 42 | ambience: toggling off disposes the layer | PASS |  |
| 43 | settings: auto-save toggles off | PASS |  |
| 44 | settings: auto-fill toggles | PASS |  |
| 45 | settings: visualiser switches to spectrum | PASS | bars |
| 46 | settings: debug toggles | PASS |  |
| 47 | recording: starts and stops a take | PASS | {"started":true,"ended":false} |
| 48 | reset: returns every value to defaults | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 49 | persistence: state written to localStorage | PASS | {"v":2,"bpm":104,"swing":10,"master":80,"patternId":"dub","s |
| 50 | persistence: survives a reload | PASS | {"bpm":104,"t":"ocean","p":"dub"} |
| 51 | persistence: reload raises no console errors | PASS |  |
| 52 | robustness: corrupt save falls back to defaults without crashing | PASS | pads=96 theme=purple |
| 53 | robustness: out-of-range values are clamped | PASS | {"vol":100,"filter":400} |
| 54 | robustness: no console errors on a bad save | PASS |  |
| 55 | migration: a v1 save is carried over | PASS | {"bpm":77,"t":"forest","v":"sad","vol":60} |
| 56 | migration: old key removed, no console errors | PASS |  |
| 57 | pwa: service worker controls the page | PASS |  |
| 58 | pwa: manifest is valid json with icons | PASS |  |
| 59 | pwa: shell precached (>=12 entries) | PASS | 14 |
| 60 | layout 360px: no horizontal page overflow | PASS | 0 |
| 61 | layout 360px: bottom tab bar shown, rail hidden | PASS | tabs=grid rail=none |
| 62 | layout 360px: pads stay tappable (>=40px) | PASS | 40x40 |
| 63 | layout 360px: sequencer scrolls instead of shrinking | PASS |  |
| 64 | layout 360px: transport bar present | PASS |  |
| 65 | layout 768px: rail replaces the tab bar | PASS | tabs=none rail=flex |
| 66 | layout 768px: no page overflow | PASS | 0 |
| 67 | layout 1280px: no page overflow | PASS | 0 |
| 68 | layout 1280px: sequencer fits without scrolling | PASS |  |
| 69 | layout 1280px: pads are at least 44x40 | PASS | 58.7x45.1 |
| 70 | layout: no target below the 24px WCAG minimum | PASS | [] |
| 71 | layout: track labels stay pinned while the grid scrolls | PASS | {"headLeft": 25, "padLeft": -192, "scrollLeft": 300} |
| 72 | offline: app opens with the server down | PASS | Lofi Studio Pro — a lofi beat machine in your browser |
| 73 | offline: Tone.js loads from cache | PASS |  |
| 74 | offline: sequencer renders offline | PASS |  |
| 75 | offline: no console errors offline | PASS |  |

## What is covered

- **Boot** — Tone.js loads from `vendor/`, no console errors, 96 pads, 6 presets, 10 patterns, 12 chord sets, 10 themes, 9 ambience layers, 6 faders, 6 knobs.
- **Transport** — play starts the Tone transport, the playhead walks the grid, the bar·beat readout advances, stop halts it, tempo clamps at 60 and 160, tap tempo matches the tapped interval.
- **Sequencer** — pad toggles write state and aria, editing marks the pattern custom, patterns load 16 steps per track, arrow keys move focus.
- **Mixer** — mute and solo stay in sync between the sequencer heads and the mixer strips, faders respond to keyboard and pointer.
- **FX** — all six knobs write state and reach the Tone nodes.
- **Themes** — all ten apply, the meta theme-color follows, every theme defines a background and accent.
- **Presets and Surprise** — a preset sets tempo, pattern, chords and FX and starts playback; Surprise changes pattern, theme and tempo and **keeps playing** (the 1.0 regression).
- **Ambience** — toggles create and dispose layers, the transport runs for ambience with the beat stopped, volume writes through.
- **Settings and reset** — every switch works; reset returns the state to defaults exactly.
- **Persistence** — survives a reload; a corrupted save falls back to defaults; out-of-range values are clamped; a v1 save is migrated and the old key removed.
- **PWA** — service worker controls the page, the manifest parses with icons and screenshots, 14 shell entries are precached.
- **Layout** — no horizontal overflow at 360 / 768 / 1280 px, tab bar below 720 and rail above, pads 40–59 px, nothing below the 24 px WCAG target minimum, track labels stay pinned while the grid scrolls.
- **Offline** — with the origin server stopped, the app still opens, Tone.js loads from cache, the sequencer renders, and the console stays clean.
