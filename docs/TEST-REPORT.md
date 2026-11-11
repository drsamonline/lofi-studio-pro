# Browser test report

**128 of 128 checks passing.** Run in headless Chromium against the real app (not a mock), driving the DOM the way a person would: clicking, holding, dragging, typing, reloading and going offline.

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
| 40 | undo: a step change becomes an undoable entry | PASS | False |
| 41 | undo: the step is put back | PASS | 1 -> 0 |
| 42 | undo: redo puts the change back | PASS | 1 |
| 43 | undo: a cleared row can be undone | PASS |  |
| 44 | undo: the cleared row comes back | PASS | 3 |
| 45 | help: ? opens the shortcut sheet | PASS |  |
| 46 | help: the sheet lists the gestures | PASS | 9 |
| 47 | help: it closes again | PASS |  |
| 48 | song: tapping an empty slot captures the current pattern | PASS |  |
| 49 | song: a second slot captures a different pattern | PASS |  |
| 50 | song: the toggle arms song mode | PASS |  |
| 51 | song: playback starts on the first filled slot | PASS | 0 |
| 52 | song: the song advances to the next slot after its bars | PASS | {"step":4,"bar":3,"slot":1,"songBar":2} |
| 53 | song: turning it off returns to loop mode | PASS |  |
| 54 | midi: valid Standard MIDI File header | PASS | fmt=0 ntrks=1 div=96 bytes=890 |
| 55 | midi: drums land on channel 10 and pitched parts elsewhere | PASS | {"drums": 52, "pitched": 56} |
| 56 | midi: chillhop writes 12 kicks over four bars | PASS | {"drums": 52, "pitched": 56} |
| 57 | midi: the first kick sits on tick 0 | PASS | 0 |
| 58 | clear: empties every track | PASS |  |
| 59 | clear: undo brings the pattern back | PASS |  |
| 60 | views: the last view is remembered across a reload | PASS | mix |
| 61 | presets: saving adds a named entry | PASS | ["Rainy Tuesday"] |
| 62 | presets: the list renders a row per preset | PASS |  |
| 63 | presets: the entry is written to localStorage | PASS |  |
| 64 | presets: loading restores tempo, pattern and theme | PASS | {"bpm":72,"p":"dub","t":"forest"} |
| 65 | presets: loading does not touch preferences | PASS |  |
| 66 | export: produces a tagged payload with the whole beat | PASS | {"app":"lofi-studio-pro","version":2,"exported":"2026-11-11T07:46:27.017Z","s... |
| 67 | import: rejects a file that is not a beat | PASS |  |
| 68 | import: accepts a beat and restores it | PASS | {"bad":true,"bpm":101,"vibe":"blues","kick":2} |
| 69 | presets: deleting removes the entry and the row | PASS |  |
| 70 | metronome: the switch writes state | PASS |  |
| 71 | count-in: the beat waits a bar before starting | PASS | 0 |
| 72 | count-in: the beat enters after the count-in bar | PASS | 6 |
| 73 | mixer: a pan slider writes per-track pan | PASS | -60 |
| 74 | mixer: pan survives into the audio channel | PASS |  |
| 75 | media session: metadata set while playing | PASS |  |
| 76 | audio: loud pattern peaks below full scale with headroom | PASS | {"peak":0.846,"rms":0.195,"crest":4.3,"clip":0} |
| 77 | audio: crest factor stays musical (not squashed) | PASS | {"peak":0.846,"rms":0.195,"crest":4.3,"clip":0} |
| 78 | audio: the capture actually contains the beat | PASS | {"peak":0.846,"rms":0.195,"crest":4.3,"clip":0} |
| 79 | fx: all six knobs respond and write state | PASS | {"filter":166,"tape":51,"crackle":51,"reverb":51,"chorus":51,"wow":51} |
| 80 | fx: filter value reached the Tone.Filter | PASS |  |
| 81 | themes: ten themes, nine distinct accents (black reuses the red) | PASS | 9 distinct |
| 82 | themes: meta theme-color follows the theme | PASS | 10 distinct |
| 83 | themes: every theme defines bg and accent | PASS |  |
| 84 | presets: Sleep applies tempo, pattern and chords | PASS | {"bpm":60,"p":"ambient","v":"dreamy"} |
| 85 | presets: applying a preset starts playback | PASS |  |
| 86 | presets: filter knob followed the preset | PASS | 2200 |
| 87 | surprise: changes pattern, theme and tempo | PASS | {"p": "synthwave", "t": "purple", "b": 115} |
| 88 | surprise: keeps playing (regression from 1.0) | PASS | started |
| 89 | surprise: still playing 3s later | PASS |  |
| 90 | views: ambience view becomes visible | PASS |  |
| 91 | ambience: rain toggles on and creates a layer | PASS |  |
| 92 | ambience: transport runs for ambience with beat stopped | PASS |  |
| 93 | ambience: volume slider writes state | PASS |  |
| 94 | ambience: toggling off disposes the layer | PASS |  |
| 95 | settings: auto-save toggles off | PASS |  |
| 96 | settings: auto-fill toggles | PASS |  |
| 97 | settings: visualiser switches to spectrum | PASS | bars |
| 98 | settings: debug toggles | PASS |  |
| 99 | recording: starts and stops a take | PASS | {"started":true,"ended":false} |
| 100 | reset: returns every value to defaults | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 101 | persistence: state written to localStorage | PASS | {"v":2,"bpm":104,"swing":10,"master":80,"patternId":"dub","s |
| 102 | persistence: survives a reload | PASS | {"bpm":104,"t":"ocean","p":"dub"} |
| 103 | persistence: reload raises no console errors | PASS |  |
| 104 | robustness: corrupt save falls back to defaults without crashing | PASS | pads=96 theme=purple |
| 105 | robustness: out-of-range values are clamped | PASS | {"vol":100,"filter":400} |
| 106 | robustness: no console errors on a bad save | PASS |  |
| 107 | migration: a v1 save is carried over | PASS | {"bpm":77,"t":"forest","v":"sad","vol":60} |
| 108 | migration: old key removed, no console errors | PASS |  |
| 109 | pwa: service worker controls the page | PASS |  |
| 110 | pwa: manifest is valid json with icons | PASS |  |
| 111 | pwa: shell precached (>=12 entries) | PASS | 15 |
| 112 | layout 360px: no horizontal page overflow | PASS | 0 |
| 113 | layout 360px: bottom tab bar shown, rail hidden | PASS | tabs=grid rail=none |
| 114 | layout 360px: pads stay tappable (>=40px) | PASS | 40x40 |
| 115 | layout 360px: sequencer scrolls instead of shrinking | PASS |  |
| 116 | layout 360px: transport bar present | PASS |  |
| 117 | layout 768px: rail replaces the tab bar | PASS | tabs=none rail=flex |
| 118 | layout 768px: no page overflow | PASS | 0 |
| 119 | layout 1280px: no page overflow | PASS | 0 |
| 120 | layout 1280px: sequencer fits without scrolling | PASS |  |
| 121 | layout 1280px: pads are at least 44x40 | PASS | 58.7x45.1 |
| 122 | layout: no target below the 24px WCAG minimum | PASS | [] |
| 123 | layout: track labels stay pinned while the grid scrolls | PASS | {"headLeft": 25, "padLeft": -192, "scrollLeft": 300} |
| 124 | offline: app opens with the server down | PASS | Lofi Studio Pro — a lofi beat machine in your browser |
| 125 | offline: sequencer renders offline | PASS |  |
| 126 | offline: library still deferred offline | PASS |  |
| 127 | offline: the library loads from cache and plays | PASS | Tone 14.8.49 |
| 128 | offline: no console errors offline | PASS |  |

## What is covered

- **Boot** — the audio library is deferred until the first gesture, then loads from `vendor/`; no console errors; 96 pads, 6 activity presets, 10 patterns, 12 chord sets, 10 themes, 9 ambience layers, 6 faders, 6 knobs.
- **Transport** — play starts the Tone transport, the playhead walks the grid, the bar·beat readout advances, stop halts it, tempo clamps at 60 and 160, tap tempo matches the tapped interval.
- **Song mode** — tapping an empty slot captures the current pattern, a second slot captures a different one, the toggle arms the mode, playback starts on the first filled slot, advances after its bar count, and returns to loop mode.
- **Metronome and count-in** — the switch writes state; with a count-in armed the beat waits a bar, then enters.
- **Sequencer** — pad toggles write state and aria, editing marks the pattern custom, patterns load 16 steps per track, arrow keys move focus.
- **Gestures** — holding a pad raises it to an accent and then a ghost; dragging across pads paints a run including the one it started on; holding a track name empties the row and the undo toast restores it.
- **Undo and redo** — a step change becomes an undoable entry, undo puts it back, redo re-applies it, a cleared row comes back, and the button disables itself when there is nothing to undo.
- **MIDI** — the bytes parse as a format-0 file with one track at 96 PPQ, drums on channel 10, pitched parts on other channels, twelve kicks over four bars, the first on tick 0.
- **Clear pattern** — empties every track, and undo brings it back.
- **Help** — `?` opens the shortcut sheet, it lists the gestures, and it closes again.
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
- **Persistence** — survives a reload, including which view you were on; a corrupted save falls back to defaults; out-of-range values are clamped; a v1 save is migrated and the old key removed.
- **PWA** — service worker controls the page, the manifest parses with icons and screenshots, 15 shell entries are precached.
- **Layout** — no horizontal overflow at 360 / 768 / 1280 px, tab bar below 720 and rail above, pads 40–59 px, nothing below the 24 px WCAG target minimum, track labels stay pinned while the grid scrolls.
- **Offline** — with the origin server stopped the app opens, the sequencer renders, the library is still deferred, and pressing play loads it from cache and starts the beat.
