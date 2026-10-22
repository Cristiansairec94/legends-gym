const path = require('path');
const fs = require('fs');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = require(path.join(__dirname, '../node_modules/sharp'));
}

async function processGreenFingerprint() {
  const imgPath = 'C:/Users/DELL/.gemini/antigravity/brain/f90c94dd-20d4-4125-a99d-000255f21f70/.user_uploaded/media_1792682192610_a829e01a.png';
  const img = sharp(imgPath);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Fingerprint center is around x=512, y=285
  // Crop area: x from 300 to 724 (width 424), y from 75 to 495 (height 420)
  const cropX = 300;
  const cropY = 75;
  const cropW = 424;
  const cropH = 424;

  const outBuf = Buffer.alloc(cropW * cropH * 4);

  for (let dy = 0; dy < cropH; dy++) {
    for (let dx = 0; dx < cropW; dx++) {
      const srcX = cropX + dx;
      const srcY = cropY + dy;
      const srcIdx = (srcY * width + srcX) * channels;
      const outIdx = (dy * cropW + dx) * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      // Remove the static white laser line near y=98 so we can animate it via CSS
      if (srcY >= 95 && srcY <= 101 && r > 180 && g > 180 && b > 180) {
        outBuf[outIdx] = 0;
        outBuf[outIdx + 1] = 0;
        outBuf[outIdx + 2] = 0;
        outBuf[outIdx + 3] = 0;
        continue;
      }

      // Check if green ridge or green glow
      const isGreen = g > 30 && (g > r + 15) && (g > b + 15);
      const isGreyWatermark = Math.abs(r - g) < 20 && Math.abs(b - g) < 20;

      if (isGreen && !isGreyWatermark) {
        // Boost green vibrancy slightly
        const boostG = Math.min(255, Math.round(g * 1.15));
        const alpha = Math.min(255, Math.round((g / 255) * 280));

        outBuf[outIdx] = Math.round(r * 0.5); // reduce red to make pure neon green
        outBuf[outIdx + 1] = boostG;
        outBuf[outIdx + 2] = Math.round(b * 0.5);
        outBuf[outIdx + 3] = alpha;
      } else {
        // Background or watermark
        outBuf[outIdx] = 0;
        outBuf[outIdx + 1] = 0;
        outBuf[outIdx + 2] = 0;
        outBuf[outIdx + 3] = 0;
      }
    }
  }

  const outPath = path.join(__dirname, '../public/biometric-green-fp.png');
  await sharp(outBuf, { raw: { width: cropW, height: cropH, channels: 4 } })
    .png()
    .toFile(outPath);

  console.log('✓ Successfully created clean transparent green fingerprint:', outPath);
}

processGreenFingerprint().catch(console.error);
