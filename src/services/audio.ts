// Web Audio API Synthesizer for biometric turnstile and POS feedback

class SoundEffects {
  private ctx: AudioContext | null = null;
  private lastGrantedTime = 0;
  private lastDeniedTime = 0;
  private muted = false;
  private explicitTerminalGate = false;
  private allowedUntilMs = 0;

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
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  public setMuted(muted: boolean) {
    this.muted = Boolean(muted);
  }

  /**
   * When enabled (Terminal Kiosk mode), blocks ALL sounds unless an explicit
   * user/access/registration interaction opens a short playback window.
   */
  public setExplicitTerminalGate(enabled: boolean) {
    this.explicitTerminalGate = Boolean(enabled);
    if (!enabled) {
      this.allowedUntilMs = 0;
    }
  }

  public allowTerminalSoundWindow(durationMs = 4000) {
    this.allowedUntilMs = Math.max(this.allowedUntilMs, Date.now() + Math.max(200, durationMs));
  }

  public clearTerminalSoundWindow() {
    this.allowedUntilMs = 0;
  }

  private canPlay(): boolean {
    if (this.muted) return false;
    if (this.explicitTerminalGate && Date.now() > this.allowedUntilMs) {
      return false;
    }
    return true;
  }

  /**
   * Executes WebAudio oscillator synthesis ONLY while the AudioContext is actively running.
   * Never queues oscillators onto a suspended context (prevents delayed phantom sounds on idle).
   */
  private runWithLiveAudio(trigger: (ctx: AudioContext) => void) {
    if (!this.canPlay()) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.ctx.state === 'running') {
      trigger(this.ctx);
      return;
    }

    if (this.ctx.state === 'suspended') {
      const requestedAt = Date.now();
      this.ctx
        .resume()
        .then(() => {
          if (
            this.ctx &&
            this.ctx.state === 'running' &&
            Date.now() - requestedAt <= 250 &&
            this.canPlay()
          ) {
            trigger(this.ctx);
          }
        })
        .catch(() => {});
    }
  }

  // Resonant, crystal-clear 4-tone futuristic chime for access granted
  playAccessGranted() {
    try {
      if (!this.canPlay()) return;
      const timestamp = Date.now();
      if (timestamp - this.lastGrantedTime < 2000) return;
      this.lastGrantedTime = timestamp;

      this.runWithLiveAudio((ctx) => {
        const now = ctx.currentTime;
        const notes = [
          { freq: 523.25, time: 0.0, dur: 0.25, vol: 0.32 },
          { freq: 659.25, time: 0.08, dur: 0.28, vol: 0.34 },
          { freq: 783.99, time: 0.16, dur: 0.32, vol: 0.36 },
          { freq: 1046.5, time: 0.26, dur: 0.65, vol: 0.42 },
        ];

        notes.forEach(({ freq, time, dur, vol }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          const oscHarmonic = ctx.createOscillator();
          const gainHarmonic = ctx.createGain();
          oscHarmonic.type = 'triangle';
          oscHarmonic.frequency.setValueAtTime(freq * 2, now + time);

          gain.gain.setValueAtTime(vol, now + time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

          gainHarmonic.gain.setValueAtTime(vol * 0.25, now + time);
          gainHarmonic.gain.exponentialRampToValueAtTime(0.001, now + time + dur * 0.7);

          osc.connect(gain);
          oscHarmonic.connect(gainHarmonic);
          gain.connect(ctx.destination);
          gainHarmonic.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + dur);
          oscHarmonic.start(now + time);
          oscHarmonic.stop(now + time + dur);
        });
      });
    } catch {
      // Audio fallback silent
    }
  }

  // Low warning buzz when access is denied or membership is expired
  playAccessDenied() {
    try {
      if (!this.canPlay()) return;
      const timestamp = Date.now();
      if (timestamp - this.lastDeniedTime < 2000) return;
      this.lastDeniedTime = timestamp;

      this.runWithLiveAudio((ctx) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.35);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      });
    } catch {
      // Audio fallback silent
    }
  }

  // Light click/beep during biometric scan touch
  playScanBlip() {
    try {
      this.runWithLiveAudio((ctx) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      });
    } catch {
      // Audio fallback silent
    }
  }

  // Subtle chime for ERP system notifications (never fires under Terminal gate)
  playNotification() {
    try {
      if (this.explicitTerminalGate) return;
      this.playScanBlip();
    } catch {}
  }

  // Cash register cha-ching sound for successful POS checkout
  playCheckoutSuccess() {
    try {
      this.runWithLiveAudio((ctx) => {
        const now = ctx.currentTime;
        [987.77, 1318.51, 1567.98].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.09);
          gain.gain.setValueAtTime(0.25, now + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.09);
          osc.stop(now + idx * 0.09 + 0.3);
        });
      });
    } catch {
      // Audio fallback silent
    }
  }

  // Classic retail POS scanner beep (1850 Hz sharp tone, 70ms)
  playBarcodeBeep() {
    try {
      this.runWithLiveAudio((ctx) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1850, now);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      });
    } catch {
      // Audio fallback silent
    }
  }

  // Low warning tone for unrecognized or out-of-stock barcode
  playBarcodeError() {
    try {
      this.runWithLiveAudio((ctx) => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.12);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      });
    } catch {
      // Audio fallback silent
    }
  }
}

export const sounds = new SoundEffects();
