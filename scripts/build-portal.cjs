const fs = require('fs');
const path = require('path');

const imgPath = path.resolve('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/gym-background.jpg');
const logoPath = path.resolve('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/logo.png');

const img1Base64 = 'data:image/jpeg;base64,' + fs.readFileSync(imgPath).toString('base64');
const logoBase64 = 'data:image/png;base64,' + fs.readFileSync(logoPath).toString('base64');

const portalPath = path.resolve('C:/Users/DELL/Desktop/gym leyends/ACCESO_WEB_FITNESS_LEGENDS.html');
let html = fs.readFileSync(portalPath, 'utf8');

html = html.replace(/\.\/LEGENDS\/public\/gym-background\.jpg/g, img1Base64);
html = html.replace(/\.\/LEGENDS\/public\/logo\.png/g, logoBase64);

fs.writeFileSync(portalPath, html, 'utf8');
console.log('Successfully embedded WhatsApp image and logo into ACCESO_WEB_FITNESS_LEGENDS.html!');
