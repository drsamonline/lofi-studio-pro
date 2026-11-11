# Browser test report

**107 of 107 checks passing.** Run in headless Chromium against the real app (not a mock), driving the DOM the way a person would: clicking, holding, dragging, typing, reloading and going offline.

Regenerate with `python3 tests/run_browser_tests.py`.

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | boot: audio library deferred until the first gesture | PASS | Tone=undefined |
| 2 | boot: first play loads the library from vendor/ | PASS | 14.8.49 |
| 3 | boot: no console errors | PASS |  |
| 4 | boot: loader removed | PASS |  |
| 5 | boot: 96 step pads rendered | PASS |  |
| 6 | boot: 6 presets / 10 patterns / 12 vibes | PASS | 6/10/12 |
| 7 | boot: 10 themes / 9 ambience / 6 faders / 6 fx knobs | PASS |  |
| 8 | boot: defaults applied | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 9 | transport: play starts Tone.Transport | PASS | started |
| 10 | transport: play button enters playing state | PASS |  |
| 11 | transport: playhead moves across pads | PASS | 6 |
| 12 | transport: bar.beat readout updates | PASS | 3·1 |
| 13 | tempo: + button raises BPM and engine | PASS | 80.99999999999999 |
| 14 | tempo: clamps at 60 | PASS | 60 |
| 15 | tempo: clamps at 160 | PASS | 160 |
| 16 | tempo: tap tempo matches the tapped interval | PASS | got 122, intervals imply 122 |
| 17 | transport: stop halts transport when no ambience | PASS | stopped |
| 18 | swing: keyboard adjusts swing state | PASS | 41 |
| 19 | pads: clicking toggles a step in state | PASS | 1 |
| 20 | pads: aria-pressed follows | PASS |  |
| 21 | pads: editing marks the pattern custom | PASS | Custom |
| 22 | pads: clicking again clears the step | PASS |  |
| 23 | patterns: loading a pattern fills 16 steps per track | PASS | {"id":"trap","hat":11} |
| 24 | pads: arrow key moves focus to next step | PASS | 1 |
| 25 | mixer: mute updates state and both controls | PASS |  |
| 26 | mixer: solo updates state | PASS |  |
| 27 | mixer: fader keyboard changes track volume | PASS | 34 |
| 28 | velocity: holding a pad raises it to an accent | PASS | 2 |
| 29 | velocity: holding again makes it a ghost | PASS | 3 |
| 30 | velocity: a plain tap still clears the step | PASS | 0 |
| 31 | pads: dragging across pads paints a run | PASS | [1,1,1,1,0,0] |
| 32 | pads: holding a track name empties that row | PASS | [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] |
| 33 | pads: the undo toast puts the row back | PASS | 3 |
| 34 | share: a pattern encodes to 48 hex characters | PASS | 410004000040004044444444410004004000400000040004 |
| 35 | share: encode/decode round-trips exactly | PASS | [1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0] |
| 36 | share: a link rebuilds the pattern and tempo | PASS | {"bpm":97,"vibe":"dark","on":20} |
| 37 | share: loading a link raises no console errors | PASS |  |
| 38 | sleep timer: cycles off to 15 minutes | PASS | 15 min |
| 39 | sleep timer: cycles on to 30 | PASS |  |
| 40 | presets: saving adds a named entry | PASS | ["Rainy Tuesday"] |
| 41 | presets: the list renders a row per preset | PASS |  |
| 42 | presets: the entry is written to localStorage | PASS |  |
| 43 | presets: loading restores tempo, pattern and theme | PASS | {"bpm":72,"p":"dub","t":"forest"} |
| 44 | presets: loading does not touch preferences | PASS |  |
| 45 | export: produces a tagged payload with the whole beat | PASS | {"app":"lofi-studio-pro","version":2,"exported":"2026-11-11T06:07:16.426Z","s... |
| 46 | import: rejects a file that is not a beat | PASS |  |
| 47 | import: accepts a beat and restores it | PASS | {"bad":true,"bpm":101,"vibe":"blues","kick":2} |
| 48 | presets: deleting removes the entry and the row | PASS |  |
| 49 | metronome: the switch writes state | PASS |  |
| 50 | count-in: the beat waits a bar before starting | PASS | 0 |
| 51 | count-in: the beat enters after the count-in bar | PASS | 6 |
| 52 | mixer: a pan slider writes per-track pan | PASS | -60 |
| 53 | mixer: pan survives into the audio channel | PASS |  |
| 54 | media session: metadata set while playing | PASS |  |
| 55 | audio: loud pattern peaks below full scale with headroom | PASS | {"peak":0.858,"rms":0.214,"crest":4,"clip":0} |
| 56 | audio: crest factor stays musical (not squashed) | PASS | {"peak":0.858,"rms":0.214,"crest":4,"clip":0} |
| 57 | audio: the capture actually contains the beat | PASS | {"peak":0.858,"rms":0.214,"crest":4,"clip":0} |
| 58 | fx: all six knobs respond and write state | PASS | {"filter":166,"tape":51,"crackle":51,"reverb":51,"chorus":51,"wow":51} |
| 59 | fx: filter value reached the Tone.Filter | PASS |  |
| 60 | themes: ten themes, nine distinct accents (black reuses the red) | PASS | 9 distinct |
| 61 | themes: meta theme-color follows the theme | PASS | 10 distinct |
| 62 | themes: every theme defines bg and accent | PASS |  |
| 63 | presets: Sleep applies tempo, pattern and chords | PASS | {"bpm":60,"p":"ambient","v":"dreamy"} |
| 64 | presets: applying a preset starts playback | PASS |  |
| 65 | presets: filter knob followed the preset | PASS | 2200 |
| 66 | surprise: changes pattern, theme and tempo | PASS | {"p": "boombap", "t": "black", "b": 83} |
| 67 | surprise: keeps playing (regression from 1.0) | PASS | started |
| 68 | surprise: still playing 3s later | PASS |  |
| 69 | views: ambience view becomes visible | PASS |  |
| 70 | ambience: rain toggles on and creates a layer | PASS |  |
| 71 | ambience: transport runs for ambience with beat stopped | PASS |  |
| 72 | ambience: volume slider writes state | PASS |  |
| 73 | ambience: toggling off disposes the layer | PASS |  |
| 74 | settings: auto-save toggles off | PASS |  |
| 75 | settings: auto-fill toggles | PASS |  |
| 76 | settings: visualiser switches to spectrum | PASS | bars |
| 77 | settings: debug toggles | PASS |  |
| 78 | recording: starts and stops a take | PASS | {"started":true,"ended":false} |
| 79 | reset: returns every value to defaults | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 80 | persistence: state written to localStorage | PASS | {"v":2,"bpm":104,"swing":10,"master":80,"patternId":"dub","s |
| 81 | persistence: survives a reload | PASS | {"bpm":104,"t":"ocean","p":"dub"} |
| 82 | persistence: reload raises no console errors | PASS |  |
| 83 | robustness: corrupt save falls back to defaults without crashing | PASS | pads=96 theme=purple |
| 84 | robustness: out-of-range values are clamped | PASS | {"vol":100,"filter":400} |
| 85 | robustness: no console errors on a bad save | PASS |  |
| 86 | migration: a v1 save is carried over | PASS | {"bpm":77,"t":"forest","v":"sad","vol":60} |
| 87 | migration: old key removed, no console errors | PASS |  |
| 88 | pwa: service worker controls the page | PASS |  |
| 89 | pwa: manifest is valid json with icons | PASS |  |
| 90 | pwa: shell precached (>=12 entries) | PASS | 14 |
| 91 | layout 360px: no horizontal page overflow | PASS | 0 |
| 92 | layout 360px: bottom tab bar shown, rail hidden | PASS | tabs=grid rail=none |
| 93 | layout 360px: pads stay tappable (>=40px) | PASS | 40x40 |
| 94 | layout 360px: sequencer scrolls instead of shrinking | PASS |  |
| 95 | layout 360px: transport bar present | PASS |  |
| 96 | layout 768px: rail replaces the tab bar | PASS | tabs=none rail=flex |
| 97 | layout 768px: no page overflow | PASS | 0 |
| 98 | layout 1280px: no page overflow | PASS | 0 |
| 99 | layout 1280px: sequencer fits without scrolling | PASS |  |
| 100 | layout 1280px: pads are at least 44x40 | PASS | 58.7x45.1 |
| 101 | layout: no target below the 24px WCAG minimum | PASS | [] |
| 102 | layout: track labels stay pinned while the grid scrolls | PASS | {"headLeft": 25, "padLeft": -192, "scrollLeft": 300} |
| 103 | offline: app opens with the server down | PASS | Lofi Studio Pro — a lofi beat machine in your browser |
| 104 | offline: sequencer renders offline | PASS |  |
| 105 | offline: library still deferred offline | PASS |  |
| 106 | offline: the library loads from cache and plays | PASS | Tone 14.8.49 |
| 107 | offline: no console errors offline | PASS |  |

## What is covered

- **Boot** — the audio library is deferred until the first gesture, then loads from `vendor/`; no console errors; 96 pads, 6 activity presets, 10 patterns, 12 chord sets, 10 themes, 9 ambience layers, 6 faders, 6 knobs.
- **Transport** — play starts the Tone transport, the playhead walks the grid, the bar·beat readout advances, stop halts it, tempo clamps at 60 and 160, tap tempo matches the tapped interval.
- **Metronome and count-in** — the switch writes state; with a count-in armed the beat waits a bar, then enters.
- **Sequencer** — pad toggles write state and aria, editing marks the pattern custom, patterns load 16 steps per track, arrow keys move focus.
- **Gestures** — holding a pad raises it to an accent and then a ghost; dragging across pads paints a run including the one it started on; holding a track name empties the row and the undo toast restores it.
- **Presets** — saving names an entry and writes it to local storage, the list renders a row per preset, loading restores tempo/pattern/theme without touching preferences, deleting removes both the entry and the row.
- **Files** — export produces a tagged payload with all six tracks; import accepts a beat and rejects anything that is not one.
- **Mixer** — mute and solo stay in sync between the sequencer heads and the mixer strips, faders and pan respond to keyboard and pointer.
- **FX** — all six knobs write state and reach the Tone nodes.
- **Themes** — all ten apply, the meta theme-color follows, every theme defines a background and accent.
- **Activity presets and Surprise** — a preset sets tempo, pattern, chords and FX and starts playback; Surprise changes pattern, theme and tempo and **keeps playing**.
- **Ambience** — toggles create and dispose layers, the transport runs for ambience with the beat stopped, volume writes through.
- **Sharing** — a pattern encodes to 48 hex characters, round-trips exactly, and a link rebuilds the pattern, tempo and chords on load.
- **Sleep timer and media session** — the timer cycles through its intervals and writes state; lock-screen metadata is set while playing.
- **Audio** — a loud pattern at full master peaks below full scale, clips zero samples, and keeps a musical crest factor.
- **Settings and reset** — every switch works; reset returns the state to defaults exactly.
- **Persistence** — survives a reload; a corrupted save falls back to defaults; out-of-range values are clamped; a v1 save is migrated and the old key removed.
- **PWA** — service worker controls the page, the manifest parses with icons and screenshots, 14 shell entries are precached.
- **Layout** — no horizontal overflow at 360 / 768 / 1280 px, tab bar below 720 and rail above, pads 40–59 px, nothing below the 24 px WCAG target minimum, track labels stay pinned while the grid scrolls.
- **Offline** — with the origin server stopped the app opens, the sequencer renders, the library is still deferred, and pressing play loads it from cache and starts the beat.
