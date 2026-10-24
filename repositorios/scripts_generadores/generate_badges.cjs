const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '02_IMAGENES_ALTA_CALIDAD/logos_y_badges');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const badges = {
  'logo_legends_gym_pro.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" width="100%" height="100%">
  <rect width="600" height="200" rx="15" fill="#030712"/>
  <!-- Corona / Icono Dumbbell -->
  <g transform="translate(40, 45)">
    <path d="M40 10 L70 40 L90 20 L110 40 L140 10 L130 70 L50 70 Z" fill="#eab308"/>
    <circle cx="90" cy="15" r="7" fill="#fbbf24"/>
    <circle cx="45" cy="10" r="5" fill="#fbbf24"/>
    <circle cx="135" cy="10" r="5" fill="#fbbf24"/>
    <rect x="25" y="75" width="130" height="15" rx="5" fill="#ca8a04"/>
  </g>
  <!-- Texto Principal -->
  <text x="210" y="95" fill="#f8fafc" font-size="44" font-weight="900" letter-spacing="2" font-family="'Segoe UI', Roboto, sans-serif">LEGENDS</text>
  <text x="430" y="95" fill="#eab308" font-size="44" font-weight="900" letter-spacing="2" font-family="'Segoe UI', Roboto, sans-serif">PRO</text>
  <!-- Subtítulo -->
  <text x="212" y="135" fill="#38bdf8" font-size="16" font-weight="700" letter-spacing="4" font-family="'Segoe UI', Roboto, sans-serif">HIGH PERFORMANCE GYM & FITNESS</text>
  <line x1="210" y1="150" x2="550" y2="150" stroke="#334155" stroke-width="2"/>
</svg>`,

  'badge_vip_gold.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>
  <circle cx="150" cy="150" r="140" fill="#0f172a" stroke="url(#gold)" stroke-width="8"/>
  <circle cx="150" cy="150" r="120" fill="#020617" stroke="#ca8a04" stroke-width="2" stroke-dasharray="6 3"/>
  <text x="150" y="110" fill="url(#gold)" font-size="34" font-weight="900" text-anchor="middle" font-family="sans-serif">VIP</text>
  <text x="150" y="145" fill="#ffffff" font-size="18" font-weight="700" text-anchor="middle" font-family="sans-serif">GOLD MEMBER</text>
  <path d="M110 170 L190 170" stroke="url(#gold)" stroke-width="3"/>
  <text x="150" y="200" fill="#94a3b8" font-size="12" font-weight="600" text-anchor="middle" font-family="sans-serif">ACCESO ILIMITADO</text>
  <text x="150" y="220" fill="#10b981" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">TODAS LAS SEDES</text>
</svg>`,

  'badge_black_pass.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="100%">
  <defs>
    <linearGradient id="silver" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <rect x="15" y="15" width="270" height="270" rx="25" fill="#020617" stroke="url(#silver)" stroke-width="6"/>
  <rect x="30" y="30" width="240" height="240" rx="18" fill="#0b0f19" stroke="#334155" stroke-width="1"/>
  <text x="150" y="105" fill="#f8fafc" font-size="30" font-weight="900" text-anchor="middle" letter-spacing="3" font-family="sans-serif">BLACK</text>
  <text x="150" y="135" fill="#38bdf8" font-size="18" font-weight="800" text-anchor="middle" letter-spacing="4" font-family="sans-serif">PASS</text>
  <rect x="60" y="155" width="180" height="2" fill="#475569"/>
  <text x="150" y="185" fill="#f8fafc" font-size="13" font-weight="600" text-anchor="middle" font-family="sans-serif">SPONSOR & ATHLETE</text>
  <text x="150" y="210" fill="#eab308" font-size="12" font-weight="bold" text-anchor="middle" font-family="sans-serif">BENEFICIOS EXCLUSIVOS POS</text>
</svg>`
};

for (const [file, content] of Object.entries(badges)) {
  fs.writeFileSync(path.join(targetDir, file), content.trim());
  console.log(`[Badge Creado] ${file}`);
}
