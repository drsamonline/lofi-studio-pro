# Changelog

All notable changes to Lofi Studio Pro. Versions follow [semver](https://semver.org/).

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
