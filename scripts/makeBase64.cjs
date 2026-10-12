const fs = require('fs');
const path = require('path');

const files = {
  maleGym1: path.join(__dirname, '../src/assets/avatars/male_gym_1.jpg'),
  maleGym2: path.join(__dirname, '../src/assets/avatars/male_gym_2.jpg'),
  femaleGym1: path.join(__dirname, '../src/assets/avatars/female_gym_1.jpg'),
  femaleGym2: path.join(__dirname, '../src/assets/avatars/female_gym_2.jpg'),
};

let out = '// Auto-generated ultra-HD base64 embedded gym avatars for 100% offline reliability\n';

for (const [key, filePath] of Object.entries(files)) {
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString('base64');
  out += `export const ${key}Base64 = "data:image/jpeg;base64,${b64}";\n`;
}

const targetPath = path.join(__dirname, '../src/assets/avatars/avatarBase64.ts');
fs.writeFileSync(targetPath, out);
console.log('SUCCESS! Generated avatarBase64.ts with size:', fs.statSync(targetPath).size);
