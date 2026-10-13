const packager = require('electron-packager');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  console.log('\n======================================================');
  console.log('1. Compilando aplicación web (TypeScript + Vite)...');
  console.log('======================================================');
  execSync('npm.cmd run build', { stdio: 'inherit' });

  console.log('\n======================================================');
  console.log('2. Generando ejecutable de Windows con Electron Packager...');
  console.log('======================================================');
  
  const iconPath = path.resolve(__dirname, '../build/icon.ico');

  const appPaths = await packager({
    dir: path.resolve(__dirname, '..'),
    name: 'FITNESS_LEGENDS_TERMINAL',
    executableName: 'ControlDeAccesoLegends',
    platform: 'win32',
    arch: 'x64',
    out: path.resolve(__dirname, '../release'),
    overwrite: true,
    asar: false,
    prune: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    appVersion: '1.0.0',
    appCopyright: 'Copyright © 2026 FITNESS LEGENDS GYM',
    win32metadata: {
      CompanyName: 'FITNESS LEGENDS GYM',
      FileDescription: 'FITNESS LEGENDS - Terminal de Control de Acceso (Torniquete)',
      OriginalFilename: 'ControlDeAccesoLegends.exe',
      ProductName: 'FITNESS LEGENDS Control de Acceso',
      InternalName: 'ControlDeAccesoLegends'
    },
    ignore: [
      /^\/src($|\/)/,
      /^\/\.git($|\/)/,
      /^\/\.gemini($|\/)/,
      /^\/release($|\/)/,
      /^\/scratch($|\/)/,
      /^\/tsconfig.*\.json$/,
      /^\/vite\.config\.ts$/,
      /^\/scripts($|\/)/
    ]
  });

  const outDir = appPaths[0];
  const exePath = path.join(outDir, 'ControlDeAccesoLegends.exe');

  console.log('\n======================================================');
  console.log('3. Ejecutable generado exitosamente');
  console.log('   Carpeta: ' + outDir);
  console.log('   Archivo .exe: ' + exePath);
  console.log('======================================================');

  // Create ZIP archive for easy distribution
  console.log('\n4. Creando archivo comprimido ZIP para fácil traslado...');
  const zipPath = path.resolve(__dirname, '../release/ControlDeAccesoLegends-Windows-x64.zip');
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    console.log('   Archivo ZIP creado en: ' + zipPath);
  } catch (zipErr) {
    console.warn('   (Aviso: No se pudo generar el ZIP automáticamente, pero la carpeta con el ejecutable está lista)');
  }

  // Create root launcher BAT
  const rootBat = path.resolve(__dirname, '../EJECUTAR_TERMINAL_ACCESO.bat');
  const batContent = `@echo off
title FITNESS LEGENDS - Control de Acceso
echo ============================================================
echo   Iniciando Terminal de Control de Acceso (Torniquete)
echo   FITNESS LEGENDS GYM - Version Ejecutable Nativa
echo ============================================================
start "" "%~dp0release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\ControlDeAccesoLegends.exe"
`;
  fs.writeFileSync(rootBat, batContent);
  console.log('   Acceso directo raíz creado en: ' + rootBat);

  console.log('\n¡Proceso de empaquetado finalizado con éxito!\n');
}

main().catch(err => {
  console.error('Error crítico al empaquetar la aplicación:', err);
  process.exit(1);
});
