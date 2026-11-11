# Browser test report

**139 of 139 checks passing.** Headless Chromium, driving the real app.

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
| 16 | tempo: tap tempo matches the tapped interval | PASS | got 119, intervals imply 119 |
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
| 32 | pads: holding a track name opens its menu | PASS |  |
| 33 | pads: the menu's clear empties that row | PASS | [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] |
| 34 | pads: the undo toast puts the row back | PASS | 3 |
| 35 | share: a pattern encodes to 48 hex characters | PASS | 410004000040004044444444410004004000400000040004 |
| 36 | share: encode/decode round-trips exactly | PASS | [1,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0] |
| 37 | share: a link rebuilds the pattern and tempo | PASS | {"bpm":97,"vibe":"dark","on":20} |
| 38 | share: loading a link raises no console errors | PASS |  |
| 39 | sleep timer: cycles off to 15 minutes | PASS | 15 min |
| 40 | sleep timer: cycles on to 30 | PASS |  |
| 41 | undo: a step change becomes an undoable entry | PASS | False |
| 42 | undo: the step is put back | PASS | 1 -> 0 |
| 43 | undo: redo puts the change back | PASS | 1 |
| 44 | undo: a cleared row can be undone | PASS |  |
| 45 | undo: the cleared row comes back | PASS | 3 |
| 46 | help: ? opens the shortcut sheet | PASS |  |
| 47 | help: the sheet lists the gestures | PASS | 9 |
| 48 | help: it closes again | PASS |  |
| 49 | copy: paste is enabled once a row is on the clipboard | PASS |  |
| 50 | copy: pasting puts the copied row on another track | PASS | [1,0,0,1,0,0] |
| 51 | midi: note-on messages are accepted without error | PASS |  |
| 52 | export: the pattern payload carries steps and chances | PASS |  |
| 53 | chance: the header button enters chance mode | PASS |  |
| 54 | chance: tapping a step in chance mode sets 75% | PASS | 75 |
| 55 | chance: the step is still on | PASS |  |
| 56 | chance: cycling returns to always | PASS | 100 |
| 57 | chance: leaving chance mode restores step editing | PASS |  |
| 58 | mixer: a reverb send slider writes per-track send | PASS | 70 |
| 59 | song: tapping an empty slot captures the current pattern | PASS |  |
| 60 | song: a second slot captures a different pattern | PASS |  |
| 61 | song: the toggle arms song mode | PASS |  |
| 62 | song: playback starts on the first filled slot | PASS | 0 |
| 63 | song: the song advances to the next slot after its bars | PASS | {"step":2,"bar":2,"slot":1,"songBar":1} |
| 64 | song: turning it off returns to loop mode | PASS |  |
| 65 | midi: valid Standard MIDI File header | PASS | fmt=0 ntrks=1 div=96 bytes=890 |
| 66 | midi: drums land on channel 10 and pitched parts elsewhere | PASS | {"drums": 52, "pitched": 56} |
| 67 | midi: chillhop writes 12 kicks over four bars | PASS | {"drums": 52, "pitched": 56} |
| 68 | midi: the first kick sits on tick 0 | PASS | 0 |
| 69 | clear: empties every track | PASS |  |
| 70 | clear: undo brings the pattern back | PASS |  |
| 71 | views: the last view is remembered across a reload | PASS | mix |
| 72 | presets: saving adds a named entry | PASS | ["Rainy Tuesday"] |
| 73 | presets: the list renders a row per preset | PASS |  |
| 74 | presets: the entry is written to localStorage | PASS |  |
| 75 | presets: loading restores tempo, pattern and theme | PASS | {"bpm":72,"p":"dub","t":"forest"} |
| 76 | presets: loading does not touch preferences | PASS |  |
| 77 | export: produces a tagged payload with the whole beat | PASS | {"app":"lofi-studio-pro","version":2,"exported":"2026-11-11T08:57:10.248Z","s... |
| 78 | import: rejects a file that is not a beat | PASS |  |
| 79 | import: accepts a beat and restores it | PASS | {"bad":true,"bpm":101,"vibe":"blues","kick":2} |
| 80 | presets: deleting removes the entry and the row | PASS |  |
| 81 | metronome: the switch writes state | PASS |  |
| 82 | count-in: the beat waits a bar before starting | PASS | 0 |
| 83 | count-in: the beat enters after the count-in bar | PASS | 6 |
| 84 | mixer: a pan slider writes per-track pan | PASS | -60 |
| 85 | mixer: pan survives into the audio channel | PASS |  |
| 86 | media session: metadata set while playing | PASS |  |
| 87 | audio: loud pattern peaks below full scale with headroom | PASS | {"peak":0.858,"rms":0.197,"crest":4.4,"clip":0} |
| 88 | audio: crest factor stays musical (not squashed) | PASS | {"peak":0.858,"rms":0.197,"crest":4.4,"clip":0} |
| 89 | audio: the capture actually contains the beat | PASS | {"peak":0.858,"rms":0.197,"crest":4.4,"clip":0} |
| 90 | fx: all six knobs respond and write state | PASS | {"filter":166,"tape":51,"crackle":51,"reverb":51,"chorus":51,"wow":51} |
| 91 | fx: filter value reached the Tone.Filter | PASS |  |
| 92 | themes: ten themes, nine distinct accents (black reuses the red) | PASS | 9 distinct |
| 93 | themes: meta theme-color follows the theme | PASS | 10 distinct |
| 94 | themes: every theme defines bg and accent | PASS |  |
| 95 | presets: Sleep applies tempo, pattern and chords | PASS | {"bpm":60,"p":"ambient","v":"dreamy"} |
| 96 | presets: applying a preset starts playback | PASS |  |
| 97 | presets: filter knob followed the preset | PASS | 2200 |
| 98 | surprise: changes pattern, theme and tempo | PASS | {"p": "minimal", "t": "midnight", "b": 117} |
| 99 | surprise: keeps playing (regression from 1.0) | PASS | started |
| 100 | surprise: still playing 3s later | PASS |  |
| 101 | views: ambience view becomes visible | PASS |  |
| 102 | ambience: rain toggles on and creates a layer | PASS |  |
| 103 | ambience: transport runs for ambience with beat stopped | PASS |  |
| 104 | ambience: volume slider writes state | PASS |  |
| 105 | ambience: toggling off disposes the layer | PASS |  |
| 106 | settings: auto-save toggles off | PASS |  |
| 107 | settings: auto-fill toggles | PASS |  |
| 108 | settings: visualiser switches to spectrum | PASS | bars |
| 109 | settings: debug toggles | PASS |  |
| 110 | recording: starts and stops a take | PASS | {"started":true,"ended":false} |
| 111 | reset: returns every value to defaults | PASS | {"bpm":80,"theme":"purple","pat":"chillhop"} |
| 112 | persistence: state written to localStorage | PASS | {"v":2,"bpm":104,"swing":10,"master":80,"patternId":"dub","s |
| 113 | persistence: survives a reload | PASS | {"bpm":104,"t":"ocean","p":"dub"} |
| 114 | persistence: reload raises no console errors | PASS |  |
| 115 | robustness: corrupt save falls back to defaults without crashing | PASS | pads=96 theme=purple |
| 116 | robustness: out-of-range values are clamped | PASS | {"vol":100,"filter":400} |
| 117 | robustness: no console errors on a bad save | PASS |  |
| 118 | migration: a v1 save is carried over | PASS | {"bpm":77,"t":"forest","v":"sad","vol":60} |
| 119 | migration: old key removed, no console errors | PASS |  |
| 120 | pwa: service worker controls the page | PASS |  |
| 121 | pwa: manifest is valid json with icons | PASS |  |
| 122 | pwa: shell precached (>=12 entries) | PASS | 15 |
| 123 | layout 360px: no horizontal page overflow | PASS | 0 |
| 124 | layout 360px: bottom tab bar shown, rail hidden | PASS | tabs=grid rail=none |
| 125 | layout 360px: pads stay tappable (>=40px) | PASS | 40x40 |
| 126 | layout 360px: sequencer scrolls instead of shrinking | PASS |  |
| 127 | layout 360px: transport bar present | PASS |  |
| 128 | layout 768px: rail replaces the tab bar | PASS | tabs=none rail=flex |
| 129 | layout 768px: no page overflow | PASS | 0 |
| 130 | layout 1280px: no page overflow | PASS | 0 |
| 131 | layout 1280px: sequencer fits without scrolling | PASS |  |
| 132 | layout 1280px: pads are at least 44x40 | PASS | 58.7x45.1 |
| 133 | layout: no target below the 24px WCAG minimum | PASS | [] |
| 134 | layout: track labels stay pinned while the grid scrolls | PASS | {"headLeft": 25, "padLeft": -192, "scrollLeft": 300} |
| 135 | offline: app opens with the server down | PASS | Lofi Studio Pro — a lofi beat machine in your browser |
| 136 | offline: sequencer renders offline | PASS |  |
| 137 | offline: library still deferred offline | PASS |  |
| 138 | offline: the library loads from cache and plays | PASS | Tone 14.8.49 |
| 139 | offline: no console errors offline | PASS |  |