const fs = require('fs');
const path = require('path');

const femalePath = path.join(__dirname, '../src/assets/avatars/female_client.png');
const malePath = path.join(__dirname, '../src/assets/avatars/male_client.png');

const femaleB64 = `data:image/png;base64,${fs.readFileSync(femalePath).toString('base64')}`;
const maleB64 = `data:image/png;base64,${fs.readFileSync(malePath).toString('base64')}`;

let out = '// Auto-generated gender-specific client avatars (100% offline reliability)\n';
out += `export const femaleClientBase64 = "${femaleB64}";\n`;
out += `export const maleClientBase64 = "${maleB64}";\n\n`;
out += '// Aliases for backward compatibility across components\n';
out += 'export const femaleGym1Base64 = femaleClientBase64;\n';
out += 'export const femaleGym2Base64 = femaleClientBase64;\n';
out += 'export const maleGym1Base64 = maleClientBase64;\n';
out += 'export const maleGym2Base64 = maleClientBase64;\n';
out += 'export const gymRackBase64 = maleClientBase64;\n';
out += 'export const gymDumbbellsBase64 = maleClientBase64;\n';
out += 'export const gymCableBase64 = femaleClientBase64;\n';
out += 'export const gymCardioBase64 = femaleClientBase64;\n';

const targetPath = path.join(__dirname, '../src/assets/avatars/avatarBase64.ts');
fs.writeFileSync(targetPath, out, 'utf8');
console.log('SUCCESS! Generated avatarBase64.ts with size:', fs.statSync(targetPath).size, 'bytes');
