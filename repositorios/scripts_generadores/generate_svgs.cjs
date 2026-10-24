const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '05_DISENOS_MAQUINAS_Y_VECTORES/vectores_svg');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const svgs = {
  // 1. Torniquete trípode de acceso
  'torniquete_acceso_tripode.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a5568"/>
      <stop offset="50%" stop-color="#2d3748"/>
      <stop offset="100%" stop-color="#1a202c"/>
    </linearGradient>
    <linearGradient id="neonGreen" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
  <!-- Background base -->
  <rect width="500" height="500" rx="20" fill="#0f172a"/>
  <!-- Base de suelo -->
  <rect x="180" y="440" width="140" height="25" rx="5" fill="#334155" stroke="#64748b" stroke-width="2"/>
  <!-- Pedestal torniquete -->
  <rect x="200" y="160" width="100" height="280" rx="8" fill="url(#metalGrad)" stroke="#475569" stroke-width="3"/>
  <!-- Pantalla y lector RFID/Biométrico superior -->
  <rect x="210" y="180" width="80" height="50" rx="6" fill="#020617" stroke="#38bdf8" stroke-width="2"/>
  <!-- Indicador LED verde de acceso -->
  <circle cx="250" cy="205" r="14" fill="url(#neonGreen)"/>
  <path d="M244 205 l4 4 l8 -8" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Cubierta angular superior -->
  <path d="M190 160 L310 160 L290 130 L210 130 Z" fill="#64748b" stroke="#94a3b8" stroke-width="2"/>
  <!-- Rotor central trípode -->
  <circle cx="250" cy="270" r="26" fill="#1e293b" stroke="#94a3b8" stroke-width="4"/>
  <!-- Brazo 1 (horizontal/bloqueo) -->
  <line x1="250" y1="270" x2="110" y2="270" stroke="#f8fafc" stroke-width="12" stroke-linecap="round"/>
  <!-- Brazo 2 (inclinado abajo derecha 120°) -->
  <line x1="250" y1="270" x2="320" y2="390" stroke="#cbd5e1" stroke-width="12" stroke-linecap="round"/>
  <!-- Brazo 3 (inclinado arriba derecha 120°) -->
  <line x1="250" y1="270" x2="320" y2="150" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"/>
  <!-- Texto descriptivo -->
  <text x="250" y="80" fill="#f8fafc" font-size="22" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">TORNIQUETE BIOMÉTRICO</text>
  <text x="250" y="105" fill="#38bdf8" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">Control de Acceso Físico y Torniquetes</text>
</svg>`,

  // 2. Lector biométrico de huella digital
  'lector_biometrico_huella.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#090d16"/>
  <!-- Marco del lector -->
  <rect x="120" y="80" width="260" height="340" rx="25" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <rect x="150" y="120" width="200" height="240" rx="15" fill="#020617" stroke="#38bdf8" stroke-width="3"/>
  <!-- Haz láser de escaneo animado -->
  <line x1="160" y1="220" x2="340" y2="220" stroke="#38bdf8" stroke-width="4" stroke-dasharray="8 4"/>
  <!-- Huella dactilar estilizada -->
  <g fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round">
    <path d="M250 160 A40 50 0 0 1 290 210 A40 50 0 0 1 250 260 A40 50 0 0 1 210 210"/>
    <path d="M250 180 A25 35 0 0 1 275 215 A25 35 0 0 1 250 250 A25 35 0 0 1 225 215"/>
    <path d="M250 200 A10 15 0 0 1 260 215 A10 15 0 0 1 250 230 A10 15 0 0 1 240 215"/>
    <path d="M295 190 A60 70 0 0 1 310 230 A60 70 0 0 1 285 285 A60 70 0 0 1 215 285"/>
    <path d="M205 190 A60 70 0 0 1 250 140 A60 70 0 0 1 320 180"/>
    <path d="M200 240 A70 80 0 0 0 250 310 A70 80 0 0 0 325 250"/>
  </g>
  <!-- LED de estado -->
  <circle cx="250" cy="385" r="10" fill="#10b981"/>
  <text x="250" y="50" fill="#f8fafc" font-size="20" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">SENSOR BIOMÉTRICO ZK / OPTICAL</text>
  <text x="250" y="470" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">Lectura Dactilar y Validación de Membresía</text>
</svg>`,

  // 3. Terminal POS Táctil y Caja
  'terminal_pos_tactil.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#0f172a"/>
  <!-- Pantalla POS Touchscreen -->
  <rect x="80" y="90" width="340" height="220" rx="12" fill="#1e293b" stroke="#475569" stroke-width="4"/>
  <rect x="95" y="105" width="310" height="190" rx="6" fill="#020617"/>
  <!-- Interfaz dentro de pantalla POS -->
  <rect x="105" y="115" width="180" height="170" fill="#0f172a" rx="4"/>
  <!-- Grid de productos -->
  <rect x="115" y="125" width="45" height="40" fill="#1e3a8a" rx="3"/>
  <rect x="170" y="125" width="45" height="40" fill="#1e3a8a" rx="3"/>
  <rect x="225" y="125" width="45" height="40" fill="#1e3a8a" rx="3"/>
  <rect x="115" y="175" width="45" height="40" fill="#1e3a8a" rx="3"/>
  <rect x="170" y="175" width="45" height="40" fill="#1e3a8a" rx="3"/>
  <rect x="225" y="175" width="45" height="40" fill="#1e3a8a" rx="3"/>
  <!-- Ticket lateral derecho -->
  <rect x="295" y="115" width="100" height="170" fill="#ffffff" rx="2"/>
  <line x1="305" y1="130" x2="385" y2="130" stroke="#0f172a" stroke-width="2"/>
  <line x1="305" y1="145" x2="365" y2="145" stroke="#64748b" stroke-width="2"/>
  <line x1="305" y1="160" x2="375" y2="160" stroke="#64748b" stroke-width="2"/>
  <line x1="305" y1="260" x2="385" y2="260" stroke="#10b981" stroke-width="4"/>
  <!-- Soporte brazo monitor -->
  <path d="M230 310 L270 310 L280 390 L220 390 Z" fill="#334155"/>
  <!-- Base metálica y cajón de dinero -->
  <rect x="140" y="390" width="220" height="20" rx="4" fill="#64748b"/>
  <rect x="100" y="415" width="300" height="45" rx="6" fill="#1e293b" stroke="#475569" stroke-width="3"/>
  <!-- Ranura de billetes/llave del cajón -->
  <circle cx="250" cy="435" r="4" fill="#94a3b8"/>
  <line x1="120" y1="445" x2="380" y2="445" stroke="#334155" stroke-width="2"/>
  <text x="250" y="55" fill="#f8fafc" font-size="20" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">PUNTO DE VENTA (POS TÁCTIL)</text>
</svg>`,

  // 4. Impresora térmica de tickets ESC/POS
  'impresora_termica_tickets.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#0b1120"/>
  <!-- Carcasa impresora -->
  <rect x="110" y="140" width="280" height="260" rx="16" fill="#1e293b" stroke="#475569" stroke-width="4"/>
  <!-- Tapa frontal superior -->
  <path d="M125 155 L375 155 L360 250 L140 250 Z" fill="#334155"/>
  <!-- Ranura de salida de papel 80mm -->
  <rect x="160" y="240" width="180" height="12" rx="4" fill="#020617"/>
  <!-- Ticket saliendo -->
  <path d="M170 240 L170 110 L330 110 L330 240 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <!-- Texto simulado en ticket -->
  <text x="250" y="130" fill="#0f172a" font-size="9" font-weight="bold" text-anchor="middle" font-family="monospace">LEGENDS PRO GYM</text>
  <line x1="180" y1="140" x2="320" y2="140" stroke="#94a3b8" stroke-width="1"/>
  <text x="185" y="155" fill="#0f172a" font-size="8" font-family="monospace">1x WHEY PROTEIN $55</text>
  <text x="185" y="170" fill="#0f172a" font-size="8" font-family="monospace">1x CREATINA 300G $35</text>
  <text x="185" y="185" fill="#0f172a" font-size="9" font-weight="bold" font-family="monospace">TOTAL: $90.00</text>
  <line x1="180" y1="195" x2="320" y2="195" stroke="#94a3b8" stroke-width="1"/>
  <rect x="235" y="200" width="30" height="30" fill="#0f172a"/>
  <!-- Botones de panel -->
  <circle cx="150" cy="350" r="10" fill="#10b981"/> <!-- POWER -->
  <circle cx="180" cy="350" r="10" fill="#eab308"/> <!-- ERROR -->
  <rect x="310" y="340" width="50" height="24" rx="4" fill="#64748b"/> <!-- FEED -->
  <text x="335" y="356" fill="#ffffff" font-size="10" font-weight="bold" text-anchor="middle" font-family="sans-serif">FEED</text>
  <text x="250" y="70" fill="#f8fafc" font-size="20" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">IMPRESORA TÉRMICA 80MM</text>
  <text x="250" y="450" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">Protocolo ESC/POS USB y Red RJ45</text>
</svg>`,

  // 5. Jaula de potencia / Power Rack
  'jaula_potencia_sentadilla.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#0f172a"/>
  <!-- Postes verticales de acero amarillo deportivo / rojo -->
  <rect x="110" y="90" width="22" height="340" fill="#eab308" rx="3"/>
  <rect x="180" y="70" width="22" height="360" fill="#ca8a04" rx="3"/>
  <rect x="300" y="70" width="22" height="360" fill="#ca8a04" rx="3"/>
  <rect x="370" y="90" width="22" height="340" fill="#eab308" rx="3"/>
  <!-- Travesaños de unión superior -->
  <rect x="110" y="90" width="282" height="20" fill="#1e293b"/>
  <line x1="120" y1="100" x2="380" y2="100" stroke="#facc15" stroke-width="8"/>
  <!-- Barra de dominadas pull-up multigrip -->
  <path d="M140 100 Q250 60 360 100" stroke="#94a3b8" stroke-width="10" fill="none"/>
  <!-- Soportes de seguridad horizontal (Safety bars) -->
  <rect x="120" y="300" width="70" height="14" fill="#cbd5e1" rx="3"/>
  <rect x="310" y="300" width="70" height="14" fill="#cbd5e1" rx="3"/>
  <!-- Barra olímpica descansando en ganchos J -->
  <rect x="70" y="240" width="360" height="12" fill="#cbd5e1" rx="3"/>
  <!-- Discos de pesas olímpicos (Bumper plates) -->
  <rect x="75" y="195" width="20" height="100" fill="#ef4444" rx="5"/>
  <rect x="97" y="205" width="16" height="80" fill="#3b82f6" rx="4"/>
  <rect x="385" y="205" width="16" height="80" fill="#3b82f6" rx="4"/>
  <rect x="403" y="195" width="20" height="100" fill="#ef4444" rx="5"/>
  <!-- Base de suelo -->
  <rect x="80" y="425" width="340" height="15" fill="#334155" rx="3"/>
  <text x="250" y="470" fill="#f8fafc" font-size="18" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">POWER RACK / JAULA OLÍMPICA</text>
</svg>`,

  // 6. Caminadora Eléctrica Profesional
  'caminadora_electrica_pro.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#0f172a"/>
  <!-- Plataforma de carrera -->
  <path d="M70 380 L380 340 L380 375 L70 415 Z" fill="#1e293b" stroke="#334155" stroke-width="3"/>
  <!-- Cinta de correr negra antideslizante -->
  <polygon points="100,385 360,350 360,365 100,400" fill="#020617"/>
  <!-- Motor delantero -->
  <rect x="360" y="315" width="75" height="70" rx="15" fill="#334155" stroke="#475569" stroke-width="2"/>
  <!-- Brazos laterales de soporte -->
  <line x1="375" y1="330" x2="305" y2="180" stroke="#64748b" stroke-width="16" stroke-linecap="round"/>
  <!-- Agarre pasamanos horizontal -->
  <line x1="305" y1="180" x2="190" y2="200" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"/>
  <!-- Consola de control y pantalla digital -->
  <polygon points="280,140 350,140 330,195 260,195" fill="#1e293b" stroke="#0ea5e9" stroke-width="3"/>
  <rect x="275" y="150" width="55" height="30" fill="#020617" rx="3"/>
  <circle cx="288" cy="165" r="4" fill="#10b981"/>
  <line x1="300" y1="165" x2="322" y2="165" stroke="#38bdf8" stroke-width="3"/>
  <text x="250" y="80" fill="#f8fafc" font-size="20" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">CAMINADORA COMERCIAL PRO</text>
  <text x="250" y="470" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="system-ui, sans-serif">Control de Aforo y Gestión de Equipamiento</text>
</svg>`,

  // 7. Mancuerna Hexagonal
  'mancuerna_hexagonal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#0f172a"/>
  <!-- Mango moleteado cromado -->
  <rect x="180" y="235" width="140" height="30" rx="5" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>
  <line x1="200" y1="235" x2="200" y2="265" stroke="#64748b" stroke-width="2"/>
  <line x1="220" y1="235" x2="220" y2="265" stroke="#64748b" stroke-width="2"/>
  <line x1="240" y1="235" x2="240" y2="265" stroke="#64748b" stroke-width="2"/>
  <line x1="260" y1="235" x2="260" y2="265" stroke="#64748b" stroke-width="2"/>
  <line x1="280" y1="235" x2="280" y2="265" stroke="#64748b" stroke-width="2"/>
  <line x1="300" y1="235" x2="300" y2="265" stroke="#64748b" stroke-width="2"/>
  <!-- Cabeza hexagonal izquierda -->
  <polygon points="120,160 180,180 180,320 120,340 70,290 70,210" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <text x="125" y="258" fill="#f8fafc" font-size="24" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">25</text>
  <text x="125" y="278" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">KG</text>
  <!-- Cabeza hexagonal derecha -->
  <polygon points="380,160 430,210 430,290 380,340 320,320 320,180" fill="#1e293b" stroke="#334155" stroke-width="4"/>
  <text x="375" y="258" fill="#f8fafc" font-size="24" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">25</text>
  <text x="375" y="278" fill="#94a3b8" font-size="12" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">KG</text>
  <text x="250" y="90" fill="#f8fafc" font-size="22" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">MANCUERNA RUBBER HEX</text>
</svg>`,

  // 8. Pesa Rusa Kettlebell
  'pesa_rusa_kettlebell.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <rect width="500" height="500" rx="20" fill="#0f172a"/>
  <!-- Agarre curvado superior -->
  <path d="M190 230 L190 140 Q250 90 310 140 L310 230" fill="none" stroke="#64748b" stroke-width="26" stroke-linecap="round"/>
  <!-- Cuerpo esférico con base plana -->
  <circle cx="250" cy="290" r="120" fill="#1e293b" stroke="#334155" stroke-width="6"/>
  <!-- Detalle banda de color identificación de peso (Rojo = 32kg) -->
  <path d="M185 195 Q250 215 315 195" stroke="#ef4444" stroke-width="12" fill="none"/>
  <!-- Base de apoyo plana -->
  <rect x="180" y="390" width="140" height="20" rx="8" fill="#0f172a"/>
  <!-- Grabado de peso -->
  <circle cx="250" cy="290" r="45" fill="#0f172a"/>
  <text x="250" y="296" fill="#f8fafc" font-size="24" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">32</text>
  <text x="250" y="318" fill="#ef4444" font-size="14" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">KG</text>
  <text x="250" y="60" fill="#f8fafc" font-size="22" font-weight="bold" text-anchor="middle" font-family="system-ui, sans-serif">KETTLEBELL COMPETICIÓN</text>
</svg>`
};

for (const [filename, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(targetDir, filename), content.trim());
  console.log(`[SVG Creado] ${filename}`);
}

console.log('¡Colección de vectores SVG completada!');
