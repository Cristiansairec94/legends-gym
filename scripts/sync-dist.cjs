const fs = require('fs');
const path = require('path');

const srcDist = path.resolve(__dirname, '../dist');
const targetDist = path.resolve(__dirname, '../release/FITNESS_LEGENDS_TERMINAL-win32-x64/resources/app/dist');

try {
  if (fs.existsSync(srcDist)) {
    if (fs.existsSync(path.dirname(targetDist))) {
      fs.cpSync(srcDist, targetDist, { recursive: true, force: true });
      console.log('✓ Release app dist synchronized successfully.');
    }
  }
} catch (err) {
  console.warn('Note: Could not sync to release directory (it may be locked or not present):', err.message);
}
