# Function inventory

Every function in the app, what it does, and whether it is exercised by the browser test suite. `tests/run_browser_tests.py` drives the interface the way a person would — clicking, dragging, typing, reloading — so "tested" here means "reached through the UI", not "called directly".

Legend: **✓** covered by an automated check · **◐** reached indirectly · **—** not covered automatically (visual or hardware-dependent).

## `js/data.js` — static musical data

| Function | Purpose | Tested |
| --- | --- | --- |
| `mk(indices)` | Builds a 16-length 0/1 step row from a list of active indices | ✓ |
| `LS.octave(note, delta)` | Transposes a Tone.js note name by octaves (bass roots down, melody up) | ◐ |

## `js/state.js` — the single source of truth

| Function | Purpose | Tested |
| --- | --- | --- |
| `num(v, min, max, fallback)` | Coerces to a finite number and clamps into range | ✓ |
| `bool(v, fallback)` | Accepts only real booleans | ✓ |
| `oneOf(list, v, fallback)` | Validates an id against a known list (themes, vibes, patterns) | ✓ |
| `obj(v)` | Guards against null / non-object nested values | ✓ |
| `defaults()` | Fresh default state: tempo, six tracks, nine ambience layers | ✓ |
| `merge(src)` | Rebuilds state from an untrusted object, one validated key at a time | ✓ |
| `migrateLegacy()` | Converts a 1.0 save (`lofi-studio-v7`) into the 2.0 shape | ✓ |
| `load()` | Reads `localStorage`, migrates if needed, falls back to defaults | ✓ |
| `save()` | Writes state as JSON; returns false when auto-save is off or quota is hit | ✓ |
| `bytes()` | Size of the saved payload, for the settings screen | ✓ |
| `clear()` | Removes both the current and legacy keys | ✓ |
| `reset()` | Restores defaults, clears storage, saves | ✓ |
| `saveSoon()` | Debounced save (400 ms) so slider drags write once | ✓ |
| `onChange(fn)` / `emit(what)` | Tiny observer hook for future extensions | — |
| `track(id)` / `step(id, i)` / `fx(k)` | Narrow accessors used by the UI and engine | ✓ |

## `js/audio.js` — the synthesis engine

| Function | Purpose | Tested |
| --- | --- | --- |
| `db(pct)` | Percent → decibels, with `-Infinity` at zero | ◐ |
| `build()` | Assembles the whole graph: master → limiter → analyser → destination, six channels, FX chain | ✓ |
| `buildInstruments()` | Creates the six voices and their per-track channels | ✓ |
| `buildCrackle()` | Vinyl crackle generator and its transport-scheduled pops | ◐ |
| `ensure()` | Resumes the AudioContext and builds the graph exactly once, even under rapid taps | ✓ |
| `setMaster` / `setFilter` / `setTape` / `setCrackle` / `setReverb` / `setChorus` / `setWow` | Push one FX value into its Tone node; all no-ops before build | ✓ |
| `setTrackVol` / `setTrackMute` / `setTrackSolo` | Per-track channel control | ✓ |
| `setViz(type)` | Switches the analyser between waveform and FFT | ✓ |
| `applyAll()` | Re-pushes every value in state onto the graph (used after reset and migration) | ✓ |
| `scheduleSequence()` / `clearSequence()` | Arms and disarms the 16th-note repeat, resetting the step and bar counters | ✓ |
| `triggerStep(i, bar, time)` | Reads state at trigger time and fires each active voice, with swing offset and auto-fill | ✓ |
| `audition(id)` | Plays a single voice immediately when a pad is switched on | ✓ |
| `startTransport()` / `stopTransport()` | Starts and stops the Tone transport at the current tempo | ✓ |
| `setBpm(v)` | Live tempo change without a restart | ✓ |
| `ambienceOn(id)` / `ambienceOff(id)` | Builds a layer from its recipe and tears it down, disposing every node | ✓ |
| `ambienceVol(id, v)` | Per-layer gain | ✓ |
| `ambienceCount()` | How many layers are running — decides whether the transport may stop | ✓ |
| `canRecord()` | Feature-detects `Tone.Recorder` and `MediaRecorder` | ✓ |
| `recordStart()` / `recordStop()` | Captures the master bus to a Blob | ✓ |
| `panic()` | Stops the transport, releases held notes, disposes ambience, ramps the master to silence and restores it | ✓ |
| `dispose()` | Full teardown of every node | ◐ |
| `position()` | Current step and bar, for readouts | ◐ |
| `rain` … `vinyl` (nine builders) | Procedural ambience recipes; each returns its own teardown closure | ✓ |

## `js/ui.js` — rendering and controls

| Function | Purpose | Tested |
| --- | --- | --- |
| `makeDrag(node, opts)` | One pointer handler shared by knobs and faders: drag, wheel, arrows, shift-for-fine, double-click reset | ✓ |
| `knob(host, opts)` | Builds a rotary control with an SVG arc, live value and ARIA slider semantics | ✓ |
| `fader(host, opts)` | Builds a vertical fader with a cap and fill | ✓ |
| `toast(msg, kind)` | Transient status message, capped at three on screen | ✓ |
| `buildSequencer()` / `paintSequencer()` | 96 pads with sticky track headers; repaints state without rebuilding the DOM | ✓ |
| `onPad(e)` / `onPadKey(e)` | Pad activation and arrow-key navigation with a roving tab stop | ✓ |
| `toggleStep(id, i)` | Flips a step, marks the pattern custom, auditions the voice, saves | ✓ |
| `buildPresets` / `buildPatterns` / `buildVibes` | Render the three chip rows | ✓ |
| `buildMixer()` | Six strips: fader plus mute and solo | ✓ |
| `buildFx()` | Six knobs bound to state and the engine | ✓ |
| `buildAmbience()` / `paintAmbience()` | Nine tiles with a switch, a level slider and an LED | ✓ |
| `buildThemes()` | Ten swatches painted from each theme's own tokens | ✓ |
| `paintPatterns` / `paintVibes` / `paintPresets` / `paintThemes` / `paintTracks` | Keep every control's selected state in sync | ✓ |
| `paintNowPlaying()` | Pattern name, chord set and tempo in the transport bar | ✓ |
| `paintTransport(playing)` | Play/pause icon, glow and body class | ✓ |
| `paintSettings()` | Switch states, visualiser label, storage figure | ✓ |
| `paintAll()` | Full repaint, used on boot and after reset | ✓ |
| `highlight(step)` / `clearHighlight()` | Moves the playhead column and the bar·beat readout | ✓ |
| `setView(name)` | Switches between Studio, Mix, Ambience, Themes and Settings | ✓ |
| `Viz.resize` / `Viz.start` / `Viz.stop` / `Viz.pause` | The 30 fps visualiser, stopped when its tab is hidden or the page is backgrounded | ◐ |
| `LS.UI.init()` | Caches elements and builds every control | ✓ |

## `js/main.js` — the controller

| Function | Purpose | Tested |
| --- | --- | --- |
| `setPlaying(v)` | Single place that flips playback state and the UI | ✓ |
| `play()` | Promise-guarded start: resume audio, arm the sequence, start the transport | ✓ |
| `stop()` | Clears the sequence and stops the transport — unless ambience still needs it | ✓ |
| `toggle()` | Play/pause for the button, the mini button and the space bar | ✓ |
| `panic()` | Stop everything, including ambience | ✓ |
| `setBpm(v)` / `nudgeBpm(d)` | Tempo with clamping and engine sync | ✓ |
| `tapTempo()` | Derives tempo from the last five taps, 2 s reset window | ✓ |
| `applyPreset(id)` | Sets tempo, swing, pattern, chords and four FX values, then plays | ✓ |
| `loadPattern(id)` | Copies a pattern into state and repaints | ✓ |
| `setVibe(id)` | Switches the chord progression | ✓ |
| `applyTheme(id)` | Applies a theme and updates the browser chrome colour | ✓ |
| `toggleAmbience(id)` | Async switch: builds or disposes a layer, keeps the transport alive as needed | ✓ |
| `pick(arr)` | Random element, for Surprise | ✓ |
| `surprise()` | Randomises pattern, chords, theme, tempo and swing without interrupting playback | ✓ |
| `toggleRecord()` | Start/stop a take and hand the file to the browser | ✓ |
| `reset()` | Stops everything, disposes ambience, restores defaults, repaints | ✓ |
| `wire()` | Every event listener in one place | ✓ |
| `setupPwa()` | Install prompt and service-worker registration | ✓ |
| `boot()` | Load state, build the UI, wire events, apply theme, hide the loader | ✓ |

## Interface surfaces

| Surface | What it does | Tested |
| --- | --- | --- |
| Transport | Play/pause, tempo ±, tap tempo, swing knob, bar·beat readout | ✓ |
| Top bar | Master volume knob, record, panic, install | ✓ |
| Sequencer | 96 pads, sticky track headers that mute on tap, auto-fill switch | ✓ |
| Mixer | Six faders, six mute/solo pairs | ✓ |
| Tape chain | Six knobs | ✓ |
| Ambience | Nine switches with level sliders | ✓ |
| Themes | Ten swatches | ✓ |
| Settings | Auto-save, auto-fill, visualiser, debug, surprise, reset, storage size, shortcuts | ✓ |
| Navigation | Icon rail above 720 px, bottom tab bar below | ✓ |
| Offline shell | Service worker precache and navigation fallback | ✓ |
| Install | `beforeinstallprompt` flow | — (needs a real browser prompt) |
| Recording download | Blob → `<a download>` | ◐ (Blob produced; download not asserted) |

## Added in 2.1.0

| Function | Where | Purpose | Tested |
| --- | --- | --- | --- |
| `velFor(v)` | audio | Maps a step's stored weight (1 normal, 2 accent, 3 ghost) to a velocity | ✓ |
| `makeImpulse(seconds, decay)` | audio | Synthesises the reverb impulse synchronously from decaying noise | ✓ |
| `fadeIn()` / `fadeOut(done)` | audio | 30 ms ramp in, 45 ms ramp out — no click on transport start or stop | ✓ |
| `bindPadPress(pad)` | ui | Tap toggles a step, a 420 ms hold cycles its weight | ✓ |
| `cycleVelocity(id, i)` | ui | normal → accent → ghost → normal | ✓ |
| `toast(msg, kind, action)` | ui | Now takes an optional action button (used by the update prompt) | ✓ |
| `State.encode()` / `State.decode(hex)` | state | 6 tracks × 16 steps × 2 bits → 48 hex characters, and back | ✓ |
| `keepAwake()` / `releaseAwake()` | main | Holds a screen wake lock while the beat plays | ◐ |
| `mediaSession(state)` | main | Lock-screen title, artwork and play/pause state | ✓ |
| `cycleSleepTimer()` | main | 0 → 15 → 30 → 60 → 90 minutes, then stops the transport | ✓ |
| `shareLink()` / `copy()` / `fallbackCopy()` | main | Share sheet where available, clipboard otherwise | ◐ |

## Added in 2.3.0

| Function | Where | Purpose | Tested |
| --- | --- | --- | --- |
| `State.snapshot()` | state | The musical half of the state — beat, sound, mix, theme — deep-copied | ✓ |
| `State.restore(snap)` | state | Applies a snapshot through the validator, preferences untouched | ✓ |
| `State.presets()` / `writePresets(list)` | state | Reads and writes the preset store, capped at 24 | ✓ |
| `State.savePreset(name)` / `deletePreset(id)` / `loadPreset(id)` | state | Create, remove, recall | ✓ |
| `State.exportState()` | state | Tagged JSON payload of the whole beat | ✓ |
| `State.importState(obj)` | state | Accepts a payload or a bare state, refuses anything that is not a beat | ✓ |
| `renderPresets()` | ui | Draws the preset rows with load and delete | ✓ |
| `savePreset()` / `loadPreset()` / `deletePreset()` | main | UI side, with toasts | ✓ |
| `exportFile()` / `importFile(file)` | main | Blob download and FileReader import | ◐ |
| `applySnapshot()` / `syncAmbience()` | main | Pushes a loaded beat into the audio engine and the UI, including which ambience layers should be running | ✓ |

## Added in 2.4.0

| Function | Where | Purpose | Tested |
| --- | --- | --- | --- |
| `loadTone()` | audio | Injects `vendor/tone.min.js` on demand and memoises the promise | ✓ |
| `buildMetronome()` | audio | The click, scheduled on the transport at quarter notes | ✓ |
| `setTrackPan(id, v)` | audio | −100…100 into the channel panner | ✓ |
| `scheduleSequence(countIn)` | audio | Starts the beat a bar late when a count-in is armed | ✓ |

## Added in 2.5.0

| Function | Where | Purpose | Tested |
| --- | --- | --- | --- |
| `State.initHistory()` / `touch()` / `commit()` | state | Snapshot history driven by the debounced save, so bursts coalesce | ✓ |
| `State.undo()` / `redo()` / `canUndo()` / `canRedo()` | state | Restore the previous or next snapshot through the validator | ✓ |
| `paintHistory()` | ui | Enables or disables the undo button | ✓ |
| `showSheet(id)` / `hideSheet(sheet)` | ui | The shortcut and iOS-install sheets | ✓ |
| `undo()` / `redo()` | main | Restores a snapshot and repaints the whole UI and engine | ✓ |
| `haptic(ms)` | main | A short vibration where the platform supports it | ◐ |

## Added in 2.6.0

| Function | Where | Purpose | Tested |
| --- | --- | --- | --- |
| `MIDI.build(data)` | midi | Four bars as a Standard MIDI File: drums on ch 10, parts on 1–3 | ✓ |
| `noteToMidi(name)` | midi | "C#4" → 61 | ✓ |
| `vlq(value)` | midi | Variable-length quantity for delta times | ✓ |
| `exportMidi()` | main | Blob download of the `.mid` | ✓ |
| `clearPattern()` | main | Empties all six tracks, undoable | ✓ |
