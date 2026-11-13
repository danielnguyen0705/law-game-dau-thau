/**
 * Web Audio API Sound Effects Synthesizer for LawGame Debate Arena
 * - Distinct Buzzer Sounds for Team A (Key F) and Team B (Key J)
 * - Dramatic Round Transition Chime
 * - Last 5 Seconds Countdown Tick-Tock
 * - Grand Victory Fanfare on Ending Screen
 */

class SoundEffectsManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  getContext() {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
  }

  // Team A Buzzer (Key F): Bright Golden Starry Chime (C5 - E5 - G5 - C6)
  playBuzzerTeamA() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.28, now + idx * 0.055 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.46);
    });
  }

  playBuzzerA() {
    this.playBuzzerTeamA();
  }

  // Team B Buzzer (Key J): Resonant Cobalt Arena Horn (D4 - A4 - D5)
  playBuzzerTeamB() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [293.66, 440.0, 587.33];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(freq * 0.96, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.22 : 0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.56);
    });
  }

  playBuzzerB() {
    this.playBuzzerTeamB();
  }

  // Dramatic Round Transition Sound
  playRoundTransition() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.52);
    });
  }

  // Final 5-Second Countdown Tick
  playCountdownTick(isFinalSecond = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isFinalSecond ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isFinalSecond ? 987.77 : 740.0, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(isFinalSecond ? 0.25 : 0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinalSecond ? 0.28 : 0.12));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinalSecond ? 0.3 : 0.13));
  }

  playTick(isFinalSecond = false) {
    this.playCountdownTick(isFinalSecond);
  }

  playTimeUp() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [311.13, 277.18, 220.0].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.36);
    });
  }

  // AI Grading Result Reveal Chime
  playGradeReveal(accuracy = 75) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const chord =
      accuracy >= 70
        ? [523.25, 659.25, 783.99, 1046.5]
        : accuracy >= 40
        ? [440, 554.37, 659.25]
        : [349.23, 329.63, 293.66];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + idx * 0.07);
      gain.gain.setValueAtTime(0.001, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.46);
    });
  }

  playScoreReveal(accuracy = 75) {
    this.playGradeReveal(accuracy);
  }

  // Grand Victory Fanfare (Royal Brass & Chime Melody)
  playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sequence = [
      { f: 523.25, t: 0.0, d: 0.18 },   // C5
      { f: 523.25, t: 0.2, d: 0.18 },   // C5
      { f: 523.25, t: 0.4, d: 0.18 },   // C5
      { f: 659.25, t: 0.6, d: 0.45 },   // E5
      { f: 587.33, t: 1.1, d: 0.22 },   // D5
      { f: 659.25, t: 1.35, d: 0.22 },  // E5
      { f: 783.99, t: 1.62, d: 0.85 },  // G5
      { f: 1046.5, t: 1.62, d: 0.85 }   // C6 harmony
    ];
    sequence.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.f, now + note.t);
      gain.gain.setValueAtTime(0.001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.24, now + note.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    });
  }
}

export const soundFX = new SoundEffectsManager();
