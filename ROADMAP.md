# Roadmap

**Shipped in 2.1.0:** wake lock, sleep timer, media session controls, share-by-link, per-step velocity, fade in/out, update prompt, iOS install sheet. **Shipped in 2.2.0:** drag-to-paint, hold-to-clear, cache budget, CI size budget, AudioContext recovery. **Shipped in 2.3.0:** named presets, export and import a beat file. **Shipped in 2.4.0:** deferred audio library, metronome, count-in, per-track pan. **Shipped in 2.5.0:** undo/redo, shortcut sheet, haptics. **Shipped in 2.6.0:** MIDI export, clear pattern, remembered view. **Shipped in 2.7.0:** song mode. Those eight rows are kept below with a ✅ so the list stays a record rather than a wish.

What to add next, ordered by value per line of code. Each item carries an effort estimate and a bloat cost, because the constraint that matters for this app is not features — it is that it stays one screen that loads instantly.

**Effort:** S ≈ under an hour · M ≈ an afternoon · L ≈ a weekend.
**Bloat:** the approximate addition to the bundle or the interface.

---

## Now — highest value for the least code

**Undo/redo and the shortcut sheet were not on this list and shipped in 2.5.0 anyway** — one-way destructive gestures were the biggest gap left in the app.

| # | Idea | Why it matters | Effort | Bloat |
| --- | --- | --- | --- | --- |
| 1 | ✅ 2.1.0 **Wake lock** (`navigator.wakeLock`) while playing | The phone screen sleeping mid-beat is the single most annoying thing about using this on a phone | S | ~10 lines |
| 2 | ✅ 2.1.0 **Sleep timer** ("stop in 30 / 60 min") in Settings | The Sleep preset exists but nothing stops it; without this the app cannot do the job it advertises | S | one row |
| 3 | ✅ 2.1.0 **Media Session controls** | Play/pause and title on the lock screen and headphone buttons — makes it feel like a player instead of a web page | S | ~15 lines |
| 4 | ✅ 2.1.0 **Share a pattern by URL** | `#p=boombap&v=nostalgic&bpm=84&s=1010…` — send a beat to a friend, and make every pattern in the roadmap shareable | M | ~60 lines, no UI |
| 5 | ✅ 2.1.0 **Per-step velocity** (long-press a pad to cycle accent / normal / ghost) | The difference between a drum machine and a drum machine that grooves. Six tracks of on/off is why patterns sound stiff | M | 3 states per step, one gesture |
| 6 | ✅ 2.1.0 **Fade in / out over 40 ms** on play and stop | Kills the click at the start of every take and in every recording | S | ~8 lines |
| 7 | ✅ 2.1.0 **Update prompt** when the service worker finds a new version | Right now a new deploy only reaches people who navigate with a connection; an installed PWA can sit on an old shell for weeks | S | one toast |
| 8 | ✅ 2.3.0 **Named user presets** (save / load / delete) | Six built-in activities are not enough once someone finds their sound | M | one screen section, ~80 lines |

## Next — offline and robustness

The app already works fully offline, including its audio library. What is left is the *edges* of offline life.

| # | Idea | Why it matters | Effort | Bloat |
| --- | --- | --- | --- | --- |
| 9 | ✅ 2.1.0 **iOS install instructions sheet** | `beforeinstallprompt` never fires on iOS, so the install button simply does not exist there. A one-time "Share → Add to Home Screen" hint recovers the whole iPhone audience | S | one dismissible sheet |
| 10 | ✅ 2.2.0 **Cache budget and eviction** | The shell is ~600 KB and grows with screenshots; cap it and prune old entries so an installed app never eats a phone's quota | S | ~20 lines in `sw.js` |
| 11 | **Save takes to a folder** (File System Access API, where available) | Turns "download" into "it appears in my Lofi folder" — the difference between a demo and a tool | M | ~50 lines, progressive |
| 12 | ✅ 2.3.0 **Export the pattern as a file** (`.lofi.json`) | Backup, share, and a migration path that does not depend on `localStorage` surviving a browser clean-up | S | ~30 lines |
| 13 | ✅ 2.2.0 **Recover gracefully from a lost AudioContext** | iOS suspends the context on a phone call or a long background; the app currently just goes quiet | M | ~30 lines |
| 14 | **Offline-first README and in-app "works offline" hint** | People do not know it works on a plane until they try it and are surprised | S | copy |

## Fast — perceived and actual speed

The first load is already small (≈120 KB of app code plus a 349 KB audio library). These keep it that way as features land.

| # | Idea | Why it matters | Effort | Bloat |
| --- | --- | --- | --- | --- |
| 15 | ✅ 2.4.0 **Load Tone.js on first interaction, not on load** | 349 KB is 75 % of the payload and nothing needs it until the first tap. Boot to interactive would drop to a few hundred milliseconds on a slow phone | M | ~20 lines, one trade-off |
| 16 | **Precompute the swing offset per tempo** | `Tone.Time('16n').toSeconds()` currently runs on every swung step; cache it when the tempo changes | S | ~5 lines |
| 17 | **`content-visibility: auto` on the hidden views** | Four of five views are inert but still cost layout on repaint | S | 2 lines of CSS |
| 18 | **Minify and precompress the shell** | ~90 KB of app code becomes ~40 KB; a `make release` script, not a build system | S | a script, no runtime cost |
| 19 | **Stop the visualiser entirely when the tab is hidden** | It is paused, but the requestAnimationFrame loop still wakes 30 times a second | S | 3 lines |
| 20 | ✅ 2.2.0 **Budget in CI** | Fail the build if the shell exceeds 700 KB — the only way this stays fast in a year | S | one step in the workflow |

## Feel — the difference between good and delightful

| # | Idea | Effort | Bloat |
| --- | --- | --- | --- |
| 21 | Haptics on pad hit (`navigator.vibrate`) | S | 2 lines |
| 22 | Pad glow follows velocity, not just on/off | S | CSS only |
| 23 | Long-press a pattern chip to preview it on the next bar | M | one timer |
| 24 | A tiny "what's this" tooltip on first visit, three steps | S | one overlay |
| 25 | ✅ 2.2.0 Drag across pads to paint a row (pointer-move while down) | M | ~40 lines |
| 26 | Copy a track's row to another track | S | one menu |

## Bigger swings, if the app earns them

| # | Idea | Why | Effort |
| --- | --- | --- | --- |
| 27 | ✅ 2.7.0 **Song mode** — chain patterns A→B→A→C with bar counts | Turns a loop into a track | L |
| 28 | ✅ 2.6.0 **MIDI export** of the pattern | The bridge to a real DAW, and the thing that makes this usable by producers | M |
| 29 | **Sample import** — drop a drum hit onto a track | Breaks the "no assets" purity, but it is the most requested feature of every drum machine | L |
| 30 | **Web MIDI input** — play the pads from a controller | Sits oddly with a browser toy, perfectly with a $60 MIDI keyboard | M |
| 31 | **Collab link** — two people on the same pattern via WebRTC | Fun, fragile, and out of scope for a solo project | L |

---

## Deliberately not doing

- **Accounts, cloud sync, a library of projects.** The whole point is that there is no sign-in and nothing to manage. If you want projects, use a DAW.
- **A sample library.** It would multiply the payload by a hundred, introduce licensing, and remove the one thing that makes this project interesting — that every sound is generated.
- **A framework.** Five plain scripts and 75 KB is not a maintenance problem. React would be.
- **Analytics.** Not even "privacy-friendly" ones. There is nothing to measure that a GitHub star does not already tell me.
- **AI generation of patterns.** Tempting, expensive, and it would make the app worse at the one thing it does well: being immediate.

## If you only do three things

1. **Wake lock + sleep timer** — an afternoon that makes the phone experience match the desktop one.
2. **Per-step velocity** — the single biggest musical upgrade available, and it fits in the existing pad.
3. **Lazy-load Tone.js** — the biggest speed win available, and it costs one `await`.

---

*Have a better idea than any of these? [Open an issue](https://github.com/drsamonline/lofi-studio-pro/issues). Good presets get shipped too.*
