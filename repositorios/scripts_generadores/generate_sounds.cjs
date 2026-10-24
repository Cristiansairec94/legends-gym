const fs = require('fs');
const path = require('path');

function createWavBuffer(sampleRate, durationSeconds, generateSample) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // 'data' subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.max(-1, Math.min(1, generateSample(t, i, numSamples)));
    const intSample = Math.floor(sample < 0 ? sample * 32768 : sample * 32767);
    buffer.writeInt16LE(intSample, offset);
    offset += 2;
  }

  return buffer;
}

const targetDir = path.resolve(__dirname, '03_SONIDOS_Y_EFECTOS_AUDIO');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const sampleRate = 44100;

// 1. Acceso Concedido Láser (High-tech upward chime)
const s1 = createWavBuffer(sampleRate, 0.45, (t) => {
  const f = 800 + 1200 * (t / 0.45);
  const env = Math.exp(-4 * t);
  return 0.7 * Math.sin(2 * Math.PI * f * t) * env;
});
fs.writeFileSync(path.join(targetDir, 'acceso_concedido_laser.wav'), s1);

// 2. Acceso Concedido Campana (Two pleasant harmonic chimes)
const s2 = createWavBuffer(sampleRate, 0.8, (t) => {
  const env1 = Math.exp(-5 * t);
  const env2 = t > 0.12 ? Math.exp(-4 * (t - 0.12)) : 0;
  const chime1 = 0.5 * Math.sin(2 * Math.PI * 1046.5 * t) * env1; // C6
  const chime2 = 0.6 * Math.sin(2 * Math.PI * 1318.5 * (t - 0.12)) * env2; // E6
  return chime1 + chime2;
});
fs.writeFileSync(path.join(targetDir, 'acceso_concedido_campana.wav'), s2);

// 3. Acceso Denegado Buzzer (Harsh low frequency double pulse)
const s3 = createWavBuffer(sampleRate, 0.6, (t) => {
  const pulse = Math.floor(t * 5) % 2 === 0;
  if (!pulse && t < 0.4) return 0;
  const env = Math.exp(-3 * (t % 0.2));
  // Sawtooth tone for harsh buzzer
  const f = 160;
  const phase = (t * f) % 1;
  const saw = (phase * 2 - 1);
  return 0.8 * saw * env;
});
fs.writeFileSync(path.join(targetDir, 'acceso_concedido_buzzer.wav'), s3); // wait, let's fix filename to acceso_denegado_buzzer
fs.writeFileSync(path.join(targetDir, 'acceso_denegado_buzzer.wav'), s3);

// 4. Acceso Denegado Alarma (Urgent triple beep alert)
const s4 = createWavBuffer(sampleRate, 0.5, (t) => {
  const part = Math.floor(t / 0.15);
  const subT = t - part * 0.15;
  if (subT > 0.09) return 0;
  const env = Math.sin(Math.PI * (subT / 0.09));
  return 0.7 * Math.sin(2 * Math.PI * 520 * t) * env;
});
fs.writeFileSync(path.join(targetDir, 'acceso_denegado_alerta.wav'), s4);

// 5. POS Caja Registradora Cha-Ching
const s5 = createWavBuffer(sampleRate, 0.9, (t) => {
  // Lever click at t=0
  const click = t < 0.05 ? (Math.random() * 2 - 1) * Math.exp(-80 * t) : 0;
  // Cha-ching bell at t=0.1
  const bell1 = t > 0.08 ? 0.5 * Math.sin(2 * Math.PI * 2400 * (t - 0.08)) * Math.exp(-4 * (t - 0.08)) : 0;
  const bell2 = t > 0.18 ? 0.7 * Math.sin(2 * Math.PI * 3600 * (t - 0.18)) * Math.exp(-5 * (t - 0.18)) : 0;
  // Coin rattle
  const rattle = (t > 0.08 && t < 0.35) ? (Math.random() * 0.25 - 0.12) * Math.exp(-6 * (t - 0.08)) : 0;
  return click + bell1 + bell2 + rattle;
});
fs.writeFileSync(path.join(targetDir, 'pos_caja_registradora_chaching.wav'), s5);

// 6. POS Lector Código de Barras (Crisp 2400Hz 60ms laser beep)
const s6 = createWavBuffer(sampleRate, 0.1, (t) => {
  if (t > 0.065) return 0;
  const env = 1 - Math.exp(-100 * t);
  return 0.65 * Math.sin(2 * Math.PI * 2600 * t) * env;
});
fs.writeFileSync(path.join(targetDir, 'pos_lector_codigo_barras.wav'), s6);

// 7. Torniquete Relé Solenoide (Mechanical relay engagement click & clack)
const s7 = createWavBuffer(sampleRate, 0.35, (t) => {
  const click1 = (Math.random() * 2 - 1) * Math.exp(-120 * t);
  const clack = t > 0.08 ? (Math.random() * 1.5 - 0.75) * Math.exp(-90 * (t - 0.08)) : 0;
  const spring = t > 0.09 ? 0.3 * Math.sin(2 * Math.PI * 320 * (t - 0.09)) * Math.exp(-25 * (t - 0.09)) : 0;
  return click1 + clack + spring;
});
fs.writeFileSync(path.join(targetDir, 'torniquete_rele_solenoide.wav'), s7);

// 8. UI HUD Radar Pulse
const s8 = createWavBuffer(sampleRate, 0.25, (t) => {
  const env = Math.exp(-8 * t);
  return 0.5 * Math.sin(2 * Math.PI * 1800 * t) * env;
});
fs.writeFileSync(path.join(targetDir, 'ui_radar_beep.wav'), s8);

console.log('¡Efectos de audio WAV generados con éxito en 03_SONIDOS_Y_EFECTOS_AUDIO!');
