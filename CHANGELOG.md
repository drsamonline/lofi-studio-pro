# Changelog

All notable changes to Lofi Studio Pro. Versions follow [semver](https://semver.org/).

## 2.4.0 — 11 November 2026

Speed, and the last of the small musical gaps.

### Changed

- **The audio library no longer blocks the first paint.** Tone.js is 341 KB — three quarters of the JavaScript — and nothing needs it until the first gesture. The script tag is gone; it is fetched on demand, from the service-worker cache, and the page is fully drawn before it arrives.

  Measured on a cold load: **107 KB of script at first paint, 448 KB after the first play.** The deferred file is still precached in the background, so offline behaviour is unchanged.

### Added

- **Metronome** — a click on every beat, accented on the first of the bar, scheduled on the same transport as the beat so it can never drift.
- **Count-in** — one bar of clicks before the beat starts. The clicks play during the count-in even with the metronome switched off, because a silent count-in is a bar of nothing.
- **Per-track pan** — a small slider under each fader in the mixer.

### Fixed

- **The spectrum visualiser killed the audio engine on reload.** The analyser was created with a size of 96, and `AnalyserNode.fftSize` must be a power of two — so anyone who switched to the spectrum view and came back later got an `IndexSizeError` and a silent app. It is 128 now. Found by the new deferred-loading test, which reloads with the spectrum view saved.

### Notes

- 107 browser checks, up from 100: deferred loading (before and after the first gesture), metronome, count-in timing, per-track pan.

## 2.3.0 — 11 November 2026

The app now keeps what you make.

### Added

- **My presets.** Name the beat you are working on, save it, load it later, delete what you have outgrown. Up to 24, stored beside the live state. A preset captures the musical half only — tempo, swing, steps, chords, effects, mix, ambience and theme — so loading someone's beat never rewrites your auto-save setting or turns on debug logging.
- **Export to a file.** Downloads a `.json` of the whole beat, so a pattern no longer lives and dies with one browser's local storage.
- **Import a file**, by button or by **dropping it anywhere in the window**. Anything that is not a beat is refused with a message instead of quietly wiping the studio.
- A settings screenshot in the README, because that is where the new stuff lives.

### Notes

- Imports go through the same validator as a saved state, so a hand-edited or ancient file can only ever produce valid values. The audio engine still never sees a bad number.
- 100 browser checks, up from 91: saving, loading, deleting, the preference-isolation rule, export shape, and import both accepting a beat and rejecting everything else.

## 2.2.0 — 11 November 2026

Gestures and robustness — the parts you only notice when they are missing.

### Added

- **Drag to paint.** Press on a pad and drag across the row to draw a run of steps in one stroke. The gesture paints in whichever direction it started (on or off), and a long press still cycles velocity, so nothing changed for a single tap.
- **Hold a track name to empty that row**, with an Undo in the toast. Building a pattern from scratch used to mean tapping forty pads off one at a time.
- **A shell size budget in CI.** The build fails if the payload passes 750 KB. This app stays fast because it stays small, and that is a promise worth enforcing rather than intending.

### Fixed

- **iOS lost its audio after a phone call.** The AudioContext is suspended by the OS on a call, a lock or a long background, and the app came back looking like it was playing and making no sound. It now resumes the context when the tab is visible again.
- **The service worker cache was unbounded.** Every navigation re-cached `index.html` and every stray asset added an entry; an installed app could quietly grow until it hit the storage quota. It is now capped at 40 entries with oldest-first eviction.

### Changed

- 91 browser checks, up from 88: drag-to-paint, hold-to-clear and its undo.

## 2.1.0 — 11 November 2026

Sound quality pass, and the first batch of roadmap items.

### Fixed — the audio engine

- **The reverb was wired as an insert.** Every voice was routed *through* the convolver with only a wet gain on the far side, so the dry signal never reached the output. At a reverb setting of zero the app was silent; at any other setting it was quiet, distant and swimming in a wash that read as noise. Reverb is now a proper parallel send.
- **The snare was bare white noise.** A `NoiseSynth` with nothing under it is a burst of hiss, not a snare. It is now a tuned body (triangle at ~110 Hz) plus a band-limited crack at 1.8 kHz.
- **The hi-hat was white noise through a 7.8 kHz highpass** — broadband hiss, eight to eleven times a bar, which is exactly what "noise" sounds like. It is now a band-passed tick at 7.6 kHz with a metallic bell at 9.8 kHz.
- **The kick was three times louder than everything else** (RMS 0.056 against 0.003–0.018 for the rest), so the mix was a kick with a noise floor. Every voice is now trimmed to a measured balance.
- **Bass and melody were monophonic** and retriggered on consecutive sixteenths, truncating their own release. Both are polyphonic now, so a new note rings over the old one instead of cutting it.
- **Every voice now opens with a ramp** of 2–20 ms and ends by decaying to silence rather than being cut.
- **No compressor, no DC blocker.** Added a 2:1 glue compressor, a −1 dB limiter, a 25 Hz high-pass (the tape stage is a waveshaper and a waveshaper fed a DC offset is a thump), and 30 ms fade-in / 45 ms fade-out on the transport.
- **Reverb no longer waits on `Tone.Reverb.generate()`.** The impulse response is synthesised synchronously from decaying noise, so it can never time out into a half-built node.
- **Vinyl crackle was a machine-gun of clicks.** It is now a quiet surface-hiss bed with sparse pops, at 40 % less gain.
- Look-ahead raised to 120 ms and the impulse shortened to 1.8 s, to reduce dropouts and convolution cost on a slow phone.

Measured on the same four seconds of the same pattern: no clipping, crest factor 6.9, and a spectrum that falls away above 300 Hz instead of sitting on a broadband shelf. The before/after figure is in `docs/audio-before-after.png`.

### Added

- **Per-step velocity.** Tap a pad to switch it on, **hold** it to cycle normal → accent → ghost. Three levels, one gesture, no mode to enter.
- **Wake lock** — the screen stays on while the beat plays.
- **Sleep timer** — 15 / 30 / 60 / 90 minutes, in Settings.
- **Lock-screen controls** via the Media Session API, with artwork.
- **Share a beat by link** — the pattern encodes to 48 hex characters, so a URL rebuilds it exactly. Applied once, then stripped from the address bar so a reload does not discard edits.
- **Update prompt** when a new service worker is waiting.
- **iOS install sheet** — `beforeinstallprompt` never fires on iOS, so one sheet explains Share → Add to Home Screen, once.
- Actionable toasts.

### Changed

- 88 browser checks, up from 75, including velocity, sharing, the sleep timer, media session, and an audio headroom test that asserts a loud pattern never reaches full scale.

## 2.0.0 — 11 November 2026

A rebuild: same instrument, new body. The single 2,366-line HTML file is now five focused scripts, the interface is a control surface rather than a stack of cards, and every bug found in the 1.0 audit is fixed.

### Fixed

- **Surprise Me stopped playback and never restarted it.** The transport was locked for 180 ms by a timer while the restart fired at 150 ms, so `startPlayback()` returned immediately. The timer is gone; the transport is now guarded by a promise, and Surprise changes state live without stopping at all.
- **A partial or older save crashed the sequencer.** `Object.assign(fresh, parsed)` replaced the nested objects before the "deep merge" ran, so it merged each object into itself and the defaults never applied. State is now rebuilt key by key through a validator.
- **The CDN was a single point of failure.** Tone.js is vendored in `vendor/`; a blocked network can no longer leave a drawn but silent app.
- **The mobile layout removed the mixer.** Track volume is visible at every width, and mute/solo are reachable from both the sequencer and the mixer.
- **The sticky tab bar overlapped the header** by 14 px at 390 px wide, because its offset was hard-coded to 60 px against a 74 px header. The shell is a fixed grid now, so nothing overlaps at any height.
- **The per-track volume slider wrapped onto its own grid row** (17 columns, 18 children). The mixer has proper strips.
- **The now-playing bar went stale** after a manual step edit. It is repainted with the pattern chips.
- **The theme colour never followed the theme.** `<meta name="theme-color">` updates on every change.
- **`beforeunload` disposed the audio graph**, which broke playback after a back-forward-cache restore. Cleanup on unload is gone.
- **Ambience bypassed the master bus**, so it ignored the master volume and the low-pass. All layers now run through the chain.
- `manifest` no longer forces `portrait-primary` on a landscape-capable layout.

### Added

- **Master volume** and a **limiter** on the output — six channels plus nine ambience layers used to sum into one fixed gain.
- **Recording** — capture a take to a downloadable audio file.
- **Tap tempo.**
- **Pad audition** — switching a step on plays that voice, so you hear what you added.
- **Physical controls** — rotary knobs and faders with pointer drag, wheel, arrow keys, double-click reset and shift-for-fine.
- **Migration** from the 1.0 save format, so nobody loses a pattern.
- **Per-theme light mode** — Bright and Lavender are genuinely light, not dark themes with pale accents.
- **Keyboard navigation** through the sequencer grid with arrow keys and a roving tab stop.
- A 75-check browser test suite, run in headless Chromium.

### Changed

- The interface is a fixed app shell: top bar, icon rail (desktop) or bottom tabs (mobile), transport docked at the bottom. No page scroll, no card grid.
- Track names are the mute switch — a 96 × 44 target instead of two 22 px letters.
- Emoji icons replaced with inline SVG, because emoji coverage varies by platform and a missing glyph is a box.
- Ambience tiles, theme swatches and presets are compact controls rather than cards.
- CSS reduced from glassmorphism panels to flat hardware surfaces — fewer compositing layers, no `backdrop-filter` on a dozen elements.
- State moved to `lofi-studio-v2` with a version field and a validator.

### Removed

- The CDN dependency, the 12 redundant `apply*` setters, dead constants (`NOTE_TO_MIDI_BASE`, `crackleLoopId`), the unused `.sr-only` class, and the six-second loading-overlay safety timer.

## 1.0.0 — 17 July 2026

First working version: one 104 KB `index.html` with a 16-step sequencer, ten patterns, twelve chord sets, nine ambience layers, ten themes, an activity-preset row and a PWA shell.
