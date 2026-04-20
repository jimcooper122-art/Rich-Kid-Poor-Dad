// Sound engine — plays real audio files with Web Audio synthesis as fallback.
// Files live in /public/sound/. Any missing file silently falls back to synthesis.

const BASE = '/sound';

const FILES: Record<string, string> = {
  click:    `${BASE}/click.ogg`,
  correct:  `${BASE}/correct.ogg`,
  wrong:    `${BASE}/wrong.ogg`,
  coin:     `${BASE}/coin.ogg`,
  coinBig:  `${BASE}/coin-big.ogg`,
  streak:   `${BASE}/streak.ogg`,
  chaChing: `${BASE}/75235__creek23__cha-ching.wav`,
  fanfare:  `${BASE}/456966__funwithsound__success-fanfare-trumpets.mp3`,
};

class SoundEngine {
  private _enabled = true;
  private loaded: Record<string, HTMLAudioElement> = {};

  // Web Audio context kept for synthesis fallback only
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    this.preload();
  }

  setEnabled(enabled: boolean) {
    this._enabled = enabled;
  }

  get enabled() {
    return this._enabled;
  }

  private preload() {
    for (const [key, src] of Object.entries(FILES)) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.addEventListener('canplaythrough', () => {
        this.loaded[key] = audio;
      }, { once: true });
    }
  }

  private play(key: string, volume = 0.7, playbackRate = 1) {
    if (!this._enabled) return;
    const src = this.loaded[key];
    if (!src) return false;
    const clip = src.cloneNode() as HTMLAudioElement;
    clip.volume = Math.min(1, volume);
    clip.playbackRate = playbackRate;
    clip.play().catch(() => {});
    return true;
  }

  // ── Synthesis fallback ────────────────────────────────────────────────────

  private ensureCtx(): AudioContext | null {
    if (!this._enabled) return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35;
        this.masterGain.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private tone(opts: {
    freq: number; duration: number; type?: OscillatorType;
    volume?: number; delay?: number; freqEnd?: number;
  }) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    const { freq, duration, type = 'sine', volume = 0.5, delay = 0, freqEnd } = opts;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 0.01), t + duration);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  click() {
    if (this.play('click', 0.5)) return;
    this.tone({ freq: 800, duration: 0.05, type: 'triangle', volume: 0.25 });
  }

  correct() {
    if (this.play('correct', 0.7)) return;
    this.tone({ freq: 523.25, duration: 0.15, type: 'triangle', volume: 0.35 });
    this.tone({ freq: 659.25, duration: 0.18, type: 'triangle', volume: 0.35, delay: 0.05 });
    this.tone({ freq: 783.99, duration: 0.3,  type: 'triangle', volume: 0.4,  delay: 0.1 });
  }

  wrong() {
    if (this.play('wrong', 0.5)) return;
    this.tone({ freq: 330, freqEnd: 220, duration: 0.35, type: 'sine', volume: 0.3 });
  }

  coin(cents: number) {
    if (cents >= 50) { this.chaChing(); return; }
    if (cents >= 20) {
      if (this.play('coinBig', 0.65)) return;
    } else {
      if (this.play('coin', 0.55)) return;
    }
    // fallback synthesis
    if (cents >= 20) {
      this.tone({ freq: 880,  duration: 0.08, type: 'triangle', volume: 0.4 });
      this.tone({ freq: 1320, duration: 0.15, type: 'triangle', volume: 0.5, delay: 0.08 });
    } else if (cents >= 10) {
      this.tone({ freq: 880,  duration: 0.08, type: 'triangle', volume: 0.4 });
      this.tone({ freq: 1174, duration: 0.12, type: 'triangle', volume: 0.45, delay: 0.07 });
    } else {
      this.tone({ freq: 1047, duration: 0.1, type: 'triangle', volume: 0.4 });
    }
  }

  chaChing() {
    if (this.play('chaChing', 0.75)) return;
    const notes = [659.25, 784, 880, 1047, 1319];
    notes.forEach((f, i) => {
      this.tone({ freq: f, duration: 0.15, type: 'triangle', volume: 0.45, delay: i * 0.06 });
    });
    this.tone({ freq: 1568, duration: 0.4, type: 'triangle', volume: 0.5, delay: 0.3 });
  }

  fanfare() {
    if (this.play('fanfare', 0.7)) return;
    const notes = [
      { f: 523.25, d: 0 }, { f: 659.25, d: 0.12 },
      { f: 784, d: 0.24 }, { f: 1047, d: 0.36 },
    ];
    notes.forEach(({ f, d }) => {
      this.tone({ freq: f, duration: 0.25, type: 'triangle', volume: 0.5, delay: d });
    });
    this.tone({ freq: 1047, duration: 0.8, type: 'triangle', volume: 0.45, delay: 0.5 });
    this.tone({ freq: 1318, duration: 0.8, type: 'triangle', volume: 0.4,  delay: 0.5 });
    this.tone({ freq: 1568, duration: 0.8, type: 'triangle', volume: 0.35, delay: 0.5 });
  }

  streakUp() {
    if (this.play('streak', 0.6)) return;
    const notes = [523.25, 659.25, 784, 1047];
    notes.forEach((f, i) => {
      this.tone({ freq: f, duration: 0.08, type: 'triangle', volume: 0.4, delay: i * 0.05 });
    });
  }

  pinOk() {
    if (this.play('correct', 0.5)) return;
    this.tone({ freq: 784,  duration: 0.1,  type: 'triangle', volume: 0.35 });
    this.tone({ freq: 1047, duration: 0.15, type: 'triangle', volume: 0.4, delay: 0.08 });
  }

  pinWrong() {
    this.wrong();
  }
}

export const sounds = new SoundEngine();
