const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath1 = 'C:/Users/DELL/Desktop/gym leyends/WhatsApp Image 2026-10-19 at 8.32.23 AM.jpeg';
const inputPath2 = 'C:/Users/DELL/Desktop/gym leyends/WhatsApp Image 2026-10-19 at 8.32.24 AM.jpeg';

const publicDir = path.resolve(__dirname, '../public');
const assetsDir = path.resolve(__dirname, '../src/assets');

async function processBackground() {
  console.log('Procesando imagen de fondo...');

  // 1. Version 1: 16:9 Cinematic Crop centered on LEYENDS GYM sign with LED lighting
  // Width 1600, height: 900 (16:9 aspect ratio), top offset 180
  const out169 = path.join(publicDir, 'gym-background.jpg');
  const out169Assets = path.join(assetsDir, 'gym-background.jpg');

  await sharp(inputPath1)
    .extract({ left: 0, top: 180, width: 1600, height: 900 })
    .resize(1920, 1080, { fit: 'cover' })
    .modulate({
      brightness: 1.30,   // +30% brillo
      saturation: 1.22    // +22% color y vivacidad
    })
    .linear(1.15, -(128 * 0.15) + 12) // Mayor contraste y tonos negros profundos pero claros
    .sharpen({ sigma: 1.2, m1: 1.0, m2: 2.0 }) // Mayor nitidez en letras y luces
    .jpeg({ quality: 94 })
    .toFile(out169);

  fs.copyFileSync(out169, out169Assets);
  console.log('✓ Creado: gym-background.jpg (16:9 Full HD 1920x1080 optimizado)');

  // 2. Version Full / Natural (toda la foto sin recorte fuerte, pero con brillo y nitidez)
  const outFull = path.join(publicDir, 'gym-background-full.jpg');
  await sharp(inputPath1)
    .resize(1920, 1440, { fit: 'cover' })
    .modulate({
      brightness: 1.32,
      saturation: 1.20
    })
    .linear(1.15, -(128 * 0.15) + 14)
    .sharpen({ sigma: 1.1 })
    .jpeg({ quality: 94 })
    .toFile(outFull);
  console.log('✓ Creado: gym-background-full.jpg');

  // 3. Process image 2 ("TU UNICO LIMITE ERES TU") as alternative background
  const outMotto = path.join(publicDir, 'gym-background-motto.jpg');
  await sharp(inputPath2)
    .resize(1920, 1440, { fit: 'cover' })
    .modulate({
      brightness: 1.28,
      saturation: 1.25
    })
    .linear(1.12, -(128 * 0.12) + 10)
    .sharpen({ sigma: 1.1 })
    .jpeg({ quality: 94 })
    .toFile(outMotto);
  console.log('✓ Creado: gym-background-motto.jpg');
}

processBackground().catch(err => {
  console.error('Error al procesar fondo:', err);
  process.exit(1);
});
