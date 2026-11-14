/**
 * Web Audio API Gameshow Sound Engine (Olympia & 1v1 Debate Arena Edition - v9.0)
 * Zero-Overlap Architecture:
 * - Tracks all active audio nodes (`activeNodes`) and stops previous chimes before major transitions
 * - Distinct Audio Scenes:
 *   1. WELCOME (Landing Page): Majestic Starry Overture
 *   2. SETUP (Pre-Match Lobby): 1v1 Fighter/Team Select Rhythm
 *   3. COMBAT_QUIZ (Transition / Buzzer / Answering): BGM 100% SILENCED — Only Olympia Question Zoom & Clock Tick-Tock!
 *   4. RESULT_OVERLAY (Round Result Popup): BGM SILENCED — Clean Score Reveal Chime Only!
 *   5. VICTORY (Championship Podium): BGM SILENCED — Clean Grand Laurel Wreath Victory Fanfare Only (Zero Overlap)!
 */

class SoundEffectsManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmPlaying = false;
    this.currentScene = 'WELCOME';
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.tickParity = 0;
    this.activeNodes = new Set();
    this._bindAutoUnlock();
  }

  _bindAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (!this.enabled) return;
      this.getContext();
      if (!this.bgmPlaying && (this.currentScene === 'WELCOME' || this.currentScene === 'SETUP')) {
        this.startBGM(this.currentScene);
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  getContext() {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _registerNode(node) {
    this.activeNodes.add(node);
    node.onended = () => {
      this.activeNodes.delete(node);
    };
  }

  stopAllSFX() {
    for (const node of Array.from(this.activeNodes)) {
      try {
        node.stop();
        node.disconnect();
      } catch {}
    }
    this.activeNodes.clear();
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) {
      this.stopBGM();
      this.stopAllSFX();
    } else if (this.currentScene === 'WELCOME' || this.currentScene === 'SETUP') {
      this.startBGM(this.currentScene);
    }
  }

  _playNoiseHit(duration = 0.08, volume = 0.07, highpass = 900) {
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
    this._registerNode(noise);
    noise.start(now);
    noise.stop(now + duration);
  }

  _playKick(startFreq = 130, endFreq = 38, duration = 0.22, volume = 0.2) {
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
    this._registerNode(osc);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  setScene(scene) {
    const isBgmScene = scene === 'WELCOME' || scene === 'SETUP';
    if (this.currentScene === scene && (isBgmScene ? this.bgmPlaying : !this.bgmPlaying)) {
      return;
    }
    this.currentScene = scene;
    if (!isBgmScene) {
      // Strictly silence BGM during COMBAT_QUIZ, RESULT_OVERLAY, and VICTORY so sounds NEVER overlap!
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
    const isBgmScene = this.currentScene === 'WELCOME' || this.currentScene === 'SETUP';
    if (!this.enabled || !isBgmScene) {
      this.stopBGM();
      return;
    }
    const ctx = this.getContext();
    if (!ctx) return;

    this.stopBGM();
    this.bgmPlaying = true;
    this.bgmStep = 0;

    if (this.currentScene === 'WELCOME') {
      const bars = [
        { bass: 73.42, notes: [293.66, 349.23, 440.0, 587.33, 523.25, 440.0, 349.23, 440.0] },
        { bass: 58.27, notes: [233.08, 293.66, 349.23, 466.16, 440.0, 349.23, 293.66, 349.23] },
        { bass: 65.41, notes: [261.63, 329.63, 392.0, 523.25, 493.88, 392.0, 329.63, 392.0] },
        { bass: 55.0,  notes: [220.0, 277.18, 329.63, 440.0, 554.37, 440.0, 329.63, 277.18] }
      ];
      const stepMs = 280;
      const tickWelcome = () => {
        if (!this.enabled || !this.bgmPlaying || this.currentScene !== 'WELCOME') return;
        const c = this.getContext();
        if (!c || c.state !== 'running') return;
        const now = c.currentTime;
        const bar = bars[Math.floor(this.bgmStep / 8) % bars.length];
        const beat = this.bgmStep % 8;

        if (beat === 0 || beat === 4) {
          this._playKick(beat === 0 ? 115 : 90, 36, 0.25, beat === 0 ? 0.14 : 0.1);
        }
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = beat % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(bar.notes[beat], now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.038, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(c.destination);
        this._registerNode(osc);
        osc.start(now);
        osc.stop(now + 0.42);
        this.bgmStep += 1;
      };
      tickWelcome();
      this.bgmTimer = setInterval(tickWelcome, stepMs);
    } else if (this.currentScene === 'SETUP') {
      const bassRiff = [146.83, 146.83, 174.61, 146.83, 196.0, 174.61, 164.81, 130.81];
      const leadStabs = [587.33, 0, 698.46, 587.33, 783.99, 0, 659.25, 523.25];
      const stepMs = 215;
      const tickSetup = () => {
        if (!this.enabled || !this.bgmPlaying || this.currentScene !== 'SETUP') return;
        const c = this.getContext();
        if (!c || c.state !== 'running') return;
        const now = c.currentTime;
        const step = this.bgmStep % 8;

        if (step % 2 === 0) {
          this._playKick(135, 42, 0.15, 0.12);
        }
        const bOsc = c.createOscillator();
        const bGain = c.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.setValueAtTime(bassRiff[step], now);
        const bFilter = c.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(480, now);
        bGain.gain.setValueAtTime(0.001, now);
        bGain.gain.exponentialRampToValueAtTime(0.048, now + 0.015);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(c.destination);
        this._registerNode(bOsc);
        bOsc.start(now);
        bOsc.stop(now + 0.18);

        const stabFreq = leadStabs[step];
        if (stabFreq > 0) {
          const sOsc = c.createOscillator();
          const sGain = c.createGain();
          sOsc.type = 'triangle';
          sOsc.frequency.setValueAtTime(stabFreq, now);
          sGain.gain.setValueAtTime(0.001, now);
          sGain.gain.exponentialRampToValueAtTime(0.03, now + 0.015);
          sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          sOsc.connect(sGain);
          sGain.connect(c.destination);
          this._registerNode(sOsc);
          sOsc.start(now);
          sOsc.stop(now + 0.17);
        }
        this.bgmStep += 1;
      };
      tickSetup();
      this.bgmTimer = setInterval(tickSetup, stepMs);
    }
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playEnterGame() {
    const ctx = this.getContext();
    if (!ctx) return;
    this.stopAllSFX();
    this.setScene('SETUP');
    const now = ctx.currentTime;
    this._playKick(160, 35, 0.3, 0.24);
    [392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.05);
      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._registerNode(osc);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.4);
    });
  }

  // Team A (Left Side) Family Feud Face-Off Double-Ding Bell + Golden LED Surge
  playBuzzerTeamA() {
    this.stopAllSFX();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(210, 45, 0.25, 0.3);
    // Iconic Family Feud Face-Off Double-Ding Bell (C6 -> G6 crystal bell harmonics)
    const bellHits = [
      { f1: 1046.5, f2: 2093.0, t: 0.0, d: 0.36 },
      { f1: 1567.98, f2: 3135.96, t: 0.09, d: 0.55 }
    ];
    bellHits.forEach((h) => {
      [h.f1, h.f2].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + h.t);
        gain.gain.setValueAtTime(0.001, now + h.t);
        gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.28 : 0.14, now + h.t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + h.t + h.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this._registerNode(osc);
        osc.start(now + h.t);
        osc.stop(now + h.t + h.d + 0.02);
      });
    });
  }

  playBuzzerA() {
    this.playBuzzerTeamA();
  }

  // Team B (Right Side) Family Feud Face-Off Electric Double-Chime + Cobalt LED Surge
  playBuzzerTeamB() {
    this.stopAllSFX();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(190, 40, 0.26, 0.3);
    // Distinct Face-Off Electric Double-Chime (A5 -> E6 -> A6)
    const bellHits = [
      { f1: 880.0, f2: 1760.0, t: 0.0, d: 0.34 },
      { f1: 1318.51, f2: 2637.02, t: 0.09, d: 0.55 }
    ];
    bellHits.forEach((h) => {
      [h.f1, h.f2].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + h.t);
        gain.gain.setValueAtTime(0.001, now + h.t);
        gain.gain.exponentialRampToValueAtTime(idx === 0 ? 0.22 : 0.14, now + h.t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + h.t + h.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        this._registerNode(osc);
        osc.start(now + h.t);
        osc.stop(now + h.t + h.d + 0.02);
      });
    });
  }

  playBuzzerB() {
    this.playBuzzerTeamB();
  }

  // "Đường Lên Đỉnh Olympia" Question Intro & Zoom-to-Top Sound Effect
  playRoundTransition() {
    this.stopBGM();
    this.stopAllSFX();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Olympia Crystal Opening Sweep (C4 -> G4 -> C5 -> E5 -> G5 -> C6)
    const olympiaMotif = [
      { f: 261.63, t: 0.0,  d: 0.18 },
      { f: 392.0,  t: 0.09, d: 0.18 },
      { f: 523.25, t: 0.18, d: 0.22 },
      { f: 659.25, t: 0.28, d: 0.25 },
      { f: 783.99, t: 0.38, d: 0.32 },
      { f: 1046.5, t: 0.52, d: 0.65 }
    ];
    this._playKick(170, 34, 0.45, 0.28);
    olympiaMotif.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0.001, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.22, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._registerNode(osc);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    });

    // 2. Whoosh Zoom-to-Top Lock Chime at t = 0.72s when question box snaps open
    const lockOsc = ctx.createOscillator();
    const lockGain = ctx.createGain();
    lockOsc.type = 'sine';
    lockOsc.frequency.setValueAtTime(587.33, now + 0.7);
    lockOsc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.98);
    lockGain.gain.setValueAtTime(0.001, now + 0.7);
    lockGain.gain.exponentialRampToValueAtTime(0.16, now + 0.78);
    lockGain.gain.exponentialRampToValueAtTime(0.001, now + 1.08);
    lockOsc.connect(lockGain);
    lockGain.connect(ctx.destination);
    this._registerNode(lockOsc);
    lockOsc.start(now + 0.7);
    lockOsc.stop(now + 1.1);
  }

  // Every-second Countdown Clock Tick-Tock (Only sound playing during question/answering)
  playCountdownTick(secondsLeft = 15) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this.tickParity = 1 - this.tickParity;

    const isCritical = secondsLeft <= 5;
    const isWarning = secondsLeft > 5 && secondsLeft <= 10;

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
    gain.gain.exponentialRampToValueAtTime(isCritical ? 0.22 : isWarning ? 0.14 : 0.1, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isCritical ? 0.2 : 0.085));
    osc.connect(gain);
    gain.connect(ctx.destination);
    this._registerNode(osc);
    osc.start(now);
    osc.stop(now + (isCritical ? 0.22 : 0.095));

    this._playKick(isCritical ? 105 : 78, 34, isCritical ? 0.14 : 0.09, isCritical ? 0.15 : 0.07);
  }

  playTick(secondsLeft = 15) {
    this.playCountdownTick(secondsLeft);
  }

  // Family Feud Giant Red [ X ] Strike Horn ("ERRR-UH!")
  playStrikeX() {
    this.stopAllSFX();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(140, 28, 0.55, 0.32);
    // Detuned low sawtooth brass cluster for classic Family Feud Strike X horn
    [110.0, 116.54, 164.81, 220.0].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.linearRampToValueAtTime(f * 0.96, now + 0.58);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(idx < 2 ? 0.18 : 0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._registerNode(osc);
      osc.start(now);
      osc.stop(now + 0.64);
    });
  }

  playTimeUp() {
    this.playStrikeX();
  }

  playGradeReveal(accuracy = 75) {
    this.stopBGM();
    this.stopAllSFX();
    if (accuracy < 35) {
      this.playStrikeX();
      return;
    }
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(180, 38, 0.35, 0.26);
    // Family Feud "Survey Says! — DING!" Board Flip Chime + Celebration Chord
    const chord =
      accuracy >= 70
        ? [987.77, 1318.51, 1567.98, 2093.0]
        : [659.25, 880.0, 1046.5, 1318.51];
    chord.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.055);
      gain.gain.setValueAtTime(0.001, now + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.055 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._registerNode(osc);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.52);
    });
  }

  playScoreReveal(accuracy = 75) {
    this.playGradeReveal(accuracy);
  }

  // Grand Olympia Championship Fanfare (Zero Overlap — Stops all other audio first!)
  playVictoryFanfare() {
    this.stopBGM();
    this.stopAllSFX();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    this._playKick(180, 32, 0.55, 0.3);
    const sequence = [
      { f: 523.25, t: 0.0,  d: 0.18 }, // C5
      { f: 523.25, t: 0.2,  d: 0.18 }, // C5
      { f: 523.25, t: 0.4,  d: 0.18 }, // C5
      { f: 659.25, t: 0.6,  d: 0.42 }, // E5
      { f: 587.33, t: 1.06, d: 0.22 }, // D5
      { f: 659.25, t: 1.3,  d: 0.22 }, // E5
      { f: 783.99, t: 1.56, d: 0.55 }, // G5
      { f: 1046.5, t: 2.15, d: 1.1  }, // C6 Grand Finale
      { f: 659.25, t: 2.15, d: 1.1  }  // E5 Harmony
    ];
    sequence.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      gain.gain.setValueAtTime(0.001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(0.22, now + note.t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      this._registerNode(osc);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.03);
    });
  }
}

export const soundFX = new SoundEffectsManager();
