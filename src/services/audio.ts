// Web Audio API Synthesizer for biometric turnstile and POS feedback

class SoundEffects {
  private ctx: AudioContext | null = null;
  private lastGrantedTime = 0;
  private lastDeniedTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlock();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public unlock() {
    try {
      this.initCtx();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }

  // Resonant, crystal-clear 4-tone futuristic chime for access granted
  playAccessGranted() {
    try {
      const timestamp = Date.now();
      if (timestamp - this.lastGrantedTime < 500) return;
      this.lastGrantedTime = timestamp;

      this.unlock();
      if (!this.ctx) return;

      const trigger = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Ascending major chord arpeggio with high sparkle:
        // C5 (523.25 Hz) -> E5 (659.25 Hz) -> G5 (783.99 Hz) -> C6 (1046.50 Hz)
        const notes = [
          { freq: 523.25, time: 0.00, dur: 0.25, vol: 0.32 },
          { freq: 659.25, time: 0.08, dur: 0.28, vol: 0.34 },
          { freq: 783.99, time: 0.16, dur: 0.32, vol: 0.36 },
          { freq: 1046.50, time: 0.26, dur: 0.65, vol: 0.42 },
        ];

        notes.forEach(({ freq, time, dur, vol }) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          // Subtle bell overtone
          const oscHarmonic = this.ctx.createOscillator();
          const gainHarmonic = this.ctx.createGain();
          oscHarmonic.type = 'triangle';
          oscHarmonic.frequency.setValueAtTime(freq * 2, now + time);

          gain.gain.setValueAtTime(vol, now + time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          gainHarmonic.gain.setValueAtTime(vol * 0.25, now + time);
          gainHarmonic.gain.exponentialRampToValueAtTime(0.001, now + time + dur * 0.7);

          osc.connect(gain);
          oscHarmonic.connect(gainHarmonic);
          gain.connect(this.ctx.destination);
          gainHarmonic.connect(this.ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur);
          oscHarmonic.start(now + time);
          oscHarmonic.stop(now + time + dur);
        });
      };

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(trigger).catch(() => {});
      } else {
        trigger();
      }
    } catch {
      // Audio fallback silent
    }
  }

  // Low warning buzz when access is denied or membership is expired
  playAccessDenied() {
    try {
      const timestamp = Date.now();
      if (timestamp - this.lastDeniedTime < 500) return;
      this.lastDeniedTime = timestamp;

      this.unlock();
      if (!this.ctx) return;

      const trigger = () => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      };

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(trigger).catch(() => {});
      } else {
        trigger();
      }
    } catch {
      // Audio fallback silent
    }
  }

  // Light click/beep during biometric scan touch
  playScanBlip() {
    try {
      this.unlock();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Audio fallback silent
    }
  }

  // Cash register cha-ching sound for successful POS checkout
  playCheckoutSuccess() {
    try {
      this.unlock();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      [987.77, 1318.51, 1567.98].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.25, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.3);
      });
    } catch {
      // Audio fallback silent
    }
  }
}

export const sounds = new SoundEffects();
