const path = require('path');
const fs = require('fs');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = require(path.join(__dirname, '../node_modules/sharp'));
}

async function completeImage() {
  const imgPath = 'C:/Users/DELL/.gemini/antigravity/brain/f90c94dd-20d4-4125-a99d-000255f21f70/.user_uploaded/media_1792680445836_54611939.png';
  const img = sharp(imgPath);
  const { data: srcData, info: srcInfo } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: srcW, height: srcH, channels: srcC } = srcInfo;

  const cx = 212;
  const cy = 378;

  // We will create an 800x800 transparent PNG
  const outW = 800;
  const outH = 800;
  const outCx = 400;
  const outCy = 400;
  const maxRadius = 375;

  const outBuf = Buffer.alloc(outW * outH * 4);

  function getSrcPixel(x, y) {
    if (x < 0 || x >= srcW || y < 0 || y >= srcH) {
      return [0, 0, 0, 0];
    }
    const idx = (Math.round(y) * srcW + Math.round(x)) * srcC;
    return [
      srcData[idx],
      srcData[idx + 1],
      srcData[idx + 2],
      srcC === 4 ? srcData[idx + 3] : 255
    ];
  }

  for (let outY = 0; outY < outH; outY++) {
    for (let outX = 0; outX < outW; outX++) {
      const dx = outX - outCx;
      const dy = outY - outCy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const outIdx = (outY * outW + outX) * 4;

      if (dist > maxRadius) {
        // Outside the HUD circle -> transparent
        outBuf[outIdx] = 0;
        outBuf[outIdx + 1] = 0;
        outBuf[outIdx + 2] = 0;
        outBuf[outIdx + 3] = 0;
        continue;
      }

      let srcX, srcY;
      srcY = cy + dy;

      if (dx >= 0) {
        srcX = cx + dx;
      } else {
        // dx < 0 (left half)
        // Check if inside fingerprint core (dist < 115)
        if (dist < 115 && (cx + dx) >= 50) {
          srcX = cx + dx; // Use real fingerprint!
        } else {
          // Mirror outer HUD rings from right side!
          srcX = cx - dx;
        }
      }

      // Feather outer edge between maxRadius - 15 and maxRadius
      let alphaMultiplier = 1;
      if (dist > maxRadius - 15) {
        alphaMultiplier = Math.max(0, (maxRadius - dist) / 15);
      }

      const [r, g, b, a] = getSrcPixel(srcX, srcY);
      outBuf[outIdx] = r;
      outBuf[outIdx + 1] = g;
      outBuf[outIdx + 2] = b;
      outBuf[outIdx + 3] = Math.round(a * alphaMultiplier);
    }
  }

  const outPath = path.join(__dirname, '../public/biometric-scanner-full.png');
  await sharp(outBuf, {
    raw: {
      width: outW,
      height: outH,
      channels: 4
    }
  })
  .png()
  .toFile(outPath);

  console.log('✓ Successfully created completed full biometric scanner:', outPath);

  // Also create a version without the central fingerprint (only the rotating rings!)
  // And a version with ONLY the central fingerprint!
  // This allows us to rotate ONLY the rings in CSS while the fingerprint stays upright with the laser scanning over it!
  const ringsBuf = Buffer.alloc(outW * outH * 4);
  const fpBuf = Buffer.alloc(outW * outH * 4);

  for (let outY = 0; outY < outH; outY++) {
    for (let outX = 0; outX < outW; outX++) {
      const dx = outX - outCx;
      const dy = outY - outCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const outIdx = (outY * outW + outX) * 4;

      const r = outBuf[outIdx];
      const g = outBuf[outIdx + 1];
      const b = outBuf[outIdx + 2];
      const a = outBuf[outIdx + 3];

      // Rings buffer: clear the central fingerprint (dist < 120)
      if (dist < 115) {
        // Inside fingerprint
        const fade = Math.max(0, (dist - 80) / 35);
        ringsBuf[outIdx] = r;
        ringsBuf[outIdx + 1] = g;
        ringsBuf[outIdx + 2] = b;
        ringsBuf[outIdx + 3] = Math.round(a * fade);

        // Fingerprint buffer: keep fingerprint, clear outer rings
        fpBuf[outIdx] = r;
        fpBuf[outIdx + 1] = g;
        fpBuf[outIdx + 2] = b;
        fpBuf[outIdx + 3] = a;
      } else {
        // Outside fingerprint: rings buffer keeps everything
        ringsBuf[outIdx] = r;
        ringsBuf[outIdx + 1] = g;
        ringsBuf[outIdx + 2] = b;
        ringsBuf[outIdx + 3] = a;

        // Fingerprint buffer is transparent outside
        fpBuf[outIdx] = 0;
        fpBuf[outIdx + 1] = 0;
        fpBuf[outIdx + 2] = 0;
        fpBuf[outIdx + 3] = 0;
      }
    }
  }

  const ringsPath = path.join(__dirname, '../public/biometric-rings.png');
  await sharp(ringsBuf, { raw: { width: outW, height: outH, channels: 4 } }).png().toFile(ringsPath);
  console.log('✓ Successfully created rotating rings:', ringsPath);

  const fpPath = path.join(__dirname, '../public/biometric-fingerprint.png');
  await sharp(fpBuf, { raw: { width: outW, height: outH, channels: 4 } }).png().toFile(fpPath);
  console.log('✓ Successfully created fingerprint center:', fpPath);
}

completeImage().catch(console.error);
