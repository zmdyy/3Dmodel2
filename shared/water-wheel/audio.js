// 合成水声：河流低频噪声 + 倾泻水声（随入槽流量变化）+ 木轴吱呀
export class WaterAudio {
  constructor() {
    this.ctx = null;
    this.on = false;
  }
  start() {
    if (!this.ctx) {
      const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const len = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5 * 0.6 + w * 0.4 * 0.15;
      }
      const mk = (type, freq, q, gain) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.playbackRate.value = 0.8 + Math.random() * 0.4;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = gain;
        src.connect(f).connect(g).connect(this.master);
        src.start();
        return g;
      };
      this.master = ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(ctx.destination);
      this.river = mk('lowpass', 700, 0.5, 0.9);
      this.pour = mk('bandpass', 1800, 0.8, 0.0);
      this.splash = mk('highpass', 3500, 0.5, 0.0);
    }
    this.ctx.resume();
    this.on = true;
    this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.4);
  }
  stop() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }
  update(pourRate, riverSpeed, distToWheel) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    const near = Math.max(0.15, Math.min(1, 25 / (distToWheel + 5)));
    this.river.gain.setTargetAtTime((0.4 + riverSpeed * 0.18) * (0.5 + 0.5 * near), t, 0.3);
    const p = Math.min(1, pourRate / 0.004);
    this.pour.gain.setTargetAtTime(p * 0.9 * near, t, 0.3);
    this.splash.gain.setTargetAtTime(p * 0.25 * near + riverSpeed * 0.03, t, 0.3);
  }
}
