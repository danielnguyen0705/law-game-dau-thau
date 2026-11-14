/**
 * Web Audio API Multi-Stage Sound Engine & 1v1 Combat/Debate Synthesizer
 * - Scene-based BGM:
 *   1. WELCOME (Landing Page): Epic Cinematic Arena Overture (Deep Brass + Timpani + Heroic D-minor Motif)
 *   2. SETUP (Pre-Match Lobby): 1v1 Fighter Select Rhythm (136 BPM Driving Bassline + Percussion + Tense Chords)
 *   3. COMBAT_QUIZ (Active Question / Buzzer / Answering): BGM SILENCED — Pure Dramatic Clock Tick-Tock & Heartbeat!
 *   4. RESULT_OVERLAY (Round Result Popup): Analytical Tension Pulse
 *   5. VICTORY: Grand Championship Fanfare
 */

class SoundEffectsManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmPlaying = false;
    this.currentScene = 'WELCOME'; // 'WELCOME' | 'SETUP' | 'COMBAT_QUIZ' | 'RESULT_OVERLAY' | 'VICTORY'
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.tickParity = 0;
    this._bindAutoUnlock();
  }

  _bindAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (!this.enabled) return;
      this.getContext();
      if (!this.bgmPlaying && (this.currentScene === 'WELCOME' || this.currentScene === 'SETUP' || this.currentScene === 'RESULT_OVERLAY')) {
        this.startBGM(this.currentScene);
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  getContext() {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) {
      this.stopBGM();
    } else if (this.currentScene !== 'COMBAT_QUIZ') {
      this.startBGM(this.currentScene);
    }
  }

  // Noise burst helper for percussion / impact hits
  _playNoiseHit(duration = 0.08, volume = 0.08, highpass = 800) {
    const c = this.getContext();
    if (!c || c.state !== 'running') return;
    const now = c.currentTime;
    const bufferSize = Math.max(1, Math.floor(c.sampleRate * duration));
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = c.createBufferSource();
    noise.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(highpass, now);

    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  // Sub-bass kick/timpani helper
  _playKick(startFreq = 130, endFreq = 38, duration = 0.22, volume = 0.22) {
    const c = this.getContext();
    if (!c || c.state !== 'running') return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Switch audio atmosphere according to game phase
  setScene(scene) {
    if (this.currentScene === scene && (scene === 'COMBAT_QUIZ' ? !this.bgmPlaying : this.bgmPlaying)) {
      return;
    }
    this.currentScene = scene;
    if (scene === 'COMBAT_QUIZ') {
      // Strictly silence BGM when question starts — only countdown clock ticks allowed!
      this.stopBGM();
      return;
    }
    if (this.enabled) {
      this.startBGM(scene);
    }
  }

  startBGM(sceneOverride) {
    if (sceneOverride) {
      this.currentScene = sceneOverride;
    }
    if (!this.enabled || this.currentScene === 'COMBAT_QUIZ') {
      this.stopBGM();
      return;
    }
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopBGM();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    if (this.currentScene === 'WELCOME') {
      // SCENE 1: WELCOME / LANDING PAGE — Majestic Dramatic Arena Overture (D Minor Heroic)
      const bars = [
        { bass: 73.42, notes: [293.66, 349.23, 440.0, 587.33, 523.25, 440.0, 349.23, 440.0] }, // Dm
        { bass: 58.27, notes: [233.08, 293.66, 349.23, 466.16, 440.0, 349.23, 293.66, 349.23] }, // Bb
        { bass: 65.41, notes: [261.63, 329.63, 392.0, 523.25, 493.88, 392.0, 329.63, 392.0] },  // C
        { bass: 55.0,  notes: [220.0, 277.18, 329.63, 440.0, 554.37, 440.0, 329.63, 277.18] }   // A7
      ];
      const stepMs = 280;
      const tickWelcome = () => {
        if (!this.enabled || !this.bgmPlaying || this.currentScene !== 'WELCOME') return;
        const c = this.getContext();
        if (!c || c.state !== 'running') return;
        const now = c.currentTime;
        const bar = bars[Math.floor(this.bgmStep / 8) % bars.length];
        const beat = this.bgmStep % 8;

        // War-drum / Timpani hit on beats 0 and 4
        if (beat === 0 || beat === 4) {
          this._playKick(beat === 0 ? 120 : 95, 36, 0.28, beat === 0 ? 0.16 : 0.11);
        }
        if (beat === 0) {
          // Deep brass drone
          const bassOsc = c.createOscillator();
          const bassGain = c.createGain();
          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(bar.bass, now);
          const filter = c.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(340, now);
          bassGain.gain.setValueAtTime(0.001, now);
          bassGain.gain.linearRampToValueAtTime(0.055, now + 0.12);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(c.destination);
          bassOsc.start(now);
          bassOsc.stop(now + 2.15);
        }

        // Dramatic lead arpeggio
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = beat % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(bar.notes[beat], now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.042, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.45);

        this.bgmStep += 1;
      };
      tickWelcome();
      this.bgmTimer = setInterval(tickWelcome, stepMs);
    } else if (this.currentScene === 'SETUP') {
      // SCENE 2: FIGHTER SELECT / PRE-MATCH SETUP — High-Energy 1v1 Combat Beat (Fast 140 BPM)
      const bassRiff = [146.83, 146.83, 174.61, 146.83, 196.0, 174.61, 164.81, 130.81];
      const leadStabs = [587.33, 0, 698.46, 587.33, 783.99, 0, 659.25, 523.25];
      const stepMs = 210;
      const tickSetup = () => {
        if (!this.enabled || !this.bgmPlaying || this.currentScene !== 'SETUP') return;
        const c = this.getContext();
        if (!c || c.state !== 'running') return;
        const now = c.currentTime;
        const step = this.bgmStep % 8;

        // Driving kick on 0, 2, 4, 6 + snare noise on 2, 6
        if (step % 2 === 0) {
          this._playKick(140, 42, 0.16, 0.14);
        }
        if (step === 2 || step === 6) {
          this._playNoiseHit(0.07, 0.05, 1200);
        } else {
          this._playNoiseHit(0.03, 0.02, 3200);
        }

        // Punchy synth bass
        const bOsc = c.createOscillator();
        const bGain = c.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassRiff[step], now);
        const bFilter = c.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(520, now);
        bGain.gain.setValueAtTime(0.001, now);
        bGain.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(c.destination);
        bOsc.start(now);
        bOsc.stop(now + 0.19);

        // Combat synth stab
        const stabFreq = leadStabs[step];
        if (stabFreq > 0) {
          const sOsc = c.createOscillator();
          const sGain = c.createGain();
          sOsc.type = 'square';
          sOsc.frequency.setValueAtTime(stabFreq, now);
          sGain.gain.setValueAtTime(0.001, now);
          sGain.gain.exponentialRampToValueAtTime(0.026, now + 0.015);
          sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          sOsc.connect(sGain);
          sGain.connect(c.destination);
          sOsc.start(now);
          sOsc.stop(now + 0.17);
        }

        this.bgmStep += 1;
      };
      tickSetup();
      this.bgmTimer = setInterval(tickSetup, stepMs);
    } else {
      // SCENE 3: RESULT_OVERLAY / VICTORY IDLE — Subtle suspense pulse
      const notes = [293.66, 349.23, 440.0, 523.25];
      const stepMs = 420;
      const tickResult = () => {
        if (!this.enabled || !this.bgmPlaying) return;
        const c = this.getContext();
        if (!c || c.state !== 'running') return;
        const now = c.currentTime;
        const freq = notes[this.bgmStep % notes.length];
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.025, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        this.bgmStep += 1;
      };
      tickResult();
      this.bgmTimer = setInterval(tickResult, stepMs);
    }
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // Enter Game / Fighter Select Transition Impact
  playEnterGame() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.setScene('SETUP');
    const now = ctx.currentTime;
    this._playKick(160, 35, 0.35, 0.28);
    this._playNoiseHit(0.14, 0.1, 900);
    [293.66, 440.0, 587.33, 880.0].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.48);
    });
  }

  // Team A Buzzer (Key F): Explosive Golden Lightning Impact + Power Horn
  playBuzzerTeamA() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(180, 40, 0.32, 0.32);
    this._playNoiseHit(0.12, 0.12, 1100);
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.001, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.24, now + idx * 0.04 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.44);
    });
  }

  playBuzzerA() {
    this.playBuzzerTeamA();
  }

  // Team B Buzzer (Key J): Cyber Cobalt Arena Horn + Heavy Bass Drop
  playBuzzerTeamB() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(150, 32, 0.35, 0.32);
    this._playNoiseHit(0.12, 0.12, 700);
    const freqs = [293.66, 440.0, 587.33, 880.0];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.92, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.09);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.24 : 0.15, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.54);
    });
  }

  playBuzzerB() {
    this.playBuzzerTeamB();
  }

  // 1v1 Combat Round Gong & Clash ("ROUND X — DEBATE!")
  playRoundTransition() {
    this.stopBGM();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Deep gong / sub-drop
    this._playKick(190, 28, 0.65, 0.35);
    this._playNoiseHit(0.22, 0.14, 600);
    // Brass battle call
    const notes = [293.66, 440.0, 587.33, 880.0];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.001, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.07 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.58);
    });
  }

  // Every-second Countdown Clock Tick-Tock (The ONLY sound playing during active question/answering)
  playCountdownTick(secondsLeft = 15) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tickParity = 1 - this.tickParity;

    const isCritical = secondsLeft <= 5;
    const isWarning = secondsLeft > 5 && secondsLeft <= 10;

    // 1. Crisp mechanical clock tick/tock
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCritical ? 'sawtooth' : isWarning ? 'square' : 'triangle';
    const baseFreq = isCritical
      ? (secondsLeft <= 2 ? 1174.66 : 987.77)
      : isWarning
      ? (this.tickParity ? 880.0 : 659.25)
      : (this.tickParity ? 783.99 : 587.33);

    osc.frequency.setValueAtTime(baseFreq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(isCritical ? 0.24 : isWarning ? 0.15 : 0.11, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCritical ? 0.22 : 0.09));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isCritical ? 0.24 : 0.1));

    // 2. Subtle heartbeat thud underneath the clock tick
    this._playKick(isCritical ? 110 : 80, 34, isCritical ? 0.16 : 0.1, isCritical ? 0.18 : 0.08);

    // 3. Double-tick on critical last 5 seconds for maximum debate pressure
    if (isCritical) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(baseFreq * 1.25, now + 0.24);
      gain2.gain.setValueAtTime(0.001, now + 0.24);
      gain2.gain.exponentialRampToValueAtTime(0.16, now + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.24);
      osc2.stop(now + 0.44);
    }
  }

  playTick(secondsLeft = 15) {
    this.playCountdownTick(secondsLeft);
  }

  playTimeUp() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(160, 25, 0.5, 0.35);
    [349.23, 311.13, 261.63, 196.0].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.11);
      gain.gain.setValueAtTime(0.001, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.24, now + idx * 0.11 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.4);
    });
  }

  // 1v1 Combat Score Slam & Grade Reveal
  playGradeReveal(accuracy = 75) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(180, 35, 0.4, 0.32);
    this._playNoiseHit(0.15, 0.12, 950);
    const chord =
      accuracy >= 70
        ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
        : accuracy >= 40
        ? [440, 554.37, 659.25, 880.0]
        : [349.23, 329.63, 293.66];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.055 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.52);
    });
  }

  playScoreReveal(accuracy = 75) {
    this.playGradeReveal(accuracy);
  }

  // Grand Championship Victory Fanfare
  playVictoryFanfare() {
    this.stopBGM();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(190, 30, 0.6, 0.35);
    const sequence = [
      { f: 523.25, t: 0.0, d: 0.16 },
      { f: 523.25, t: 0.18, d: 0.16 },
      { f: 523.25, t: 0.36, d: 0.16 },
      { f: 659.25, t: 0.54, d: 0.42 },
      { f: 587.33, t: 1.0, d: 0.22 },
      { f: 659.25, t: 1.24, d: 0.22 },
      { f: 783.99, t: 1.5, d: 0.9 },
      { f: 1046.5, t: 1.5, d: 0.9 }
    ];
    sequence.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      gain.gain.setValueAtTime(0.001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.22, now + note.t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    });
  }
}

export const soundFX = new SoundEffectsManager();
