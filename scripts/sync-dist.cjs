const fs = require('fs');
const path = require('path');

const srcDist = path.resolve(__dirname, '../dist');
const targetDist = path.resolve(__dirname, '../release/FITNESS_LEGENDS_TERMINAL-win32-x64/resources/app/dist');

function syncDistSafe(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'index.html') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(s, d, { recursive: true, force: true });
    } else if (entry.isFile()) {
      fs.copyFileSync(s, d);
    }
  }
  const srcHtml = path.join(src, 'index.html');
  const destHtml = path.join(dest, 'index.html');
  if (fs.existsSync(srcHtml)) {
    const tmpHtml = destHtml + '.tmp';
    try {
      fs.copyFileSync(srcHtml, tmpHtml);
      fs.renameSync(tmpHtml, destHtml);
    } catch {
      try { fs.unlinkSync(tmpHtml); } catch {}
      fs.copyFileSync(srcHtml, destHtml);
    }
  }
}

try {
  if (fs.existsSync(srcDist) && fs.existsSync(path.dirname(targetDist))) {
    syncDistSafe(srcDist, targetDist);
    console.log('✓ Release app dist synchronized successfully.');
  }
} catch (err) {
  console.warn('Note: Could not sync to release directory (it may be locked or not present):', err.message);
}
