/* Records the master bus as raw float PCM so the app can write a real WAV
   instead of re-encoding through Opus. Runs on the audio thread. */
class LofiCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.on = false;
    this.left = [];
    this.right = [];
    this.frames = 0;
    this.limit = 0;
    this.port.onmessage = (e) => {
      if (e.data === 'start') {
        this.on = true;
        this.left = [];
        this.right = [];
        this.frames = 0;
        this.limit = sampleRate * 180;   // three minutes is plenty for a loop
      } else if (e.data === 'stop') {
        this.on = false;
        this.port.postMessage({
          left: this.left, right: this.right, frames: this.frames,
          sampleRate: sampleRate, done: true
        });
        this.left = [];
        this.right = [];
      }
    };
  }

  process(inputs) {
    if (!this.on) return true;
    const input = inputs[0];
    if (input && input.length) {
      const l = input[0];
      const r = input.length > 1 ? input[1] : input[0];
      this.left.push(new Float32Array(l));
      this.right.push(new Float32Array(r));
      this.frames += l.length;
      if (this.frames >= this.limit) {
        this.port.postMessage({ left: this.left, right: this.right, frames: this.frames, sampleRate: sampleRate, done: true, capped: true });
        this.on = false;
        this.left = [];
        this.right = [];
      }
    }
    return true;
  }
}
registerProcessor('lofi-capture', LofiCapture);
