# Attribution

Lofi Studio Pro is a thin, opinionated layer on top of one excellent library. Here is exactly what came from where.

## Sound engine

**[Tone.js](https://tonejs.github.io/)** 15.1.22 — MIT License, © 2014–2023 Yotam Mann and contributors.

Tone.js provides the Web Audio abstraction, the transport and clock, every synthesiser voice (Membrane, Noise, FM, AM, Poly, Metal), the effect units (Filter, Distortion, Chorus, Tremolo, Reverb, Limiter, Volume, Analyser) and the recorder. It is vendored unmodified at `vendor/tone.min.js` so the app can run offline; the licence text is reproduced below.

```
MIT License

Copyright (c) 2014-2023 Yotam Mann

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Audio content

**There are no audio files in this repository.** No samples, loops, breaks, records, field recordings, impulse responses or third-party sound packs. Every kick, snare, hat, bass note, chord, pop of vinyl crackle, bird chirp and roll of thunder is generated at runtime from oscillators, noise generators and envelopes. The reverb impulse is synthesised by Tone.js when the app starts.

That means there is nothing here to clear, and no sample library whose licence you need to inherit. Patterns and chord progressions are original arrangements of common harmonic material.

## Visual assets

- **App icons** (`icons/*.png`) are generated from the shapes drawn in this repository — a record disc with three waveform bars.
- **Interface icons** are inline SVG paths written for this project, in `index.html` and `js/data.js`. No icon-font or icon-pack dependency.
- **Type** is the platform system UI stack (`ui-sans-serif, system-ui, …`). No webfont is loaded, so there is no font licence to carry and no network request for text.
- **Screenshots** in `screenshots/` are captures of this app, made by this project.

## Licence text

The PolyForm Noncommercial License 1.0.0 in `LICENSE` is reproduced from the [PolyForm Project](https://polyformproject.org/licenses/noncommercial/1.0.0/), which publishes these licences for free reuse. It is unmodified apart from the `Required Notice` line, which names this project's copyright holder as the licence intends.

## Sibling projects

Parts of the 2.1.0 audio rebuild were learned from **[neonboom](https://github.com/drsamonline/neonboom)**, another browser beat workstation by the same author, whose engine had already solved several of the problems this app had:

- the **glue compressor → limiter → master gain** ordering, and the idea of a master chain that is built once and reused;
- **synthesising the reverb impulse from decaying noise** instead of waiting on an async `generate()` that can time out;
- the **voice discipline** — every envelope opens from near-silence with a short ramp and closes by ramping to zero, never by being cut;
- the **16-bit PCM WAV encoder** in `src/audio/wav.js`, which is the model for the recording format this app will move to.

No code was copied between the repositories; the two engines are independent implementations of the same ideas. Credit is recorded here because the ideas were not invented here.

## Inspiration

The interface owes an obvious debt to hardware drum machines and to the mobile step sequencers of the last few years — Teenage Engineering's OP-1 and OP-Z, Ableton Note, Korg's Gadget. No assets, layouts or code were taken from any of them; the resemblance is to a genre of instrument, not to a product.

The lofi aesthetic itself — tape wobble, filtered highs, vinyl noise, seventh chords — is a tradition with no owner. This app is an affectionate imitation of a sound, not a copy of a recording.

## Fonts, trademarks, names

"Lofi Studio Pro" is the name of this project. Tone.js is a trademark of its authors and is used here only to describe a dependency. No endorsement by any of the above is claimed or implied.
