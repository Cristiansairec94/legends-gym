const packager = require('electron-packager');
const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

async function main() {
  try {
    execSync('taskkill /F /IM ControlDeAccesoLegends.exe /T', { stdio: 'ignore' });
  } catch {}

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
  const erpExePath = path.join(outDir, 'FitnessLegends.exe');

  // Provide both FitnessLegends.exe and ControlDeAccesoLegends.exe
  try {
    if (!fs.existsSync(erpExePath) && fs.existsSync(exePath)) {
      fs.copyFileSync(exePath, erpExePath);
    }
  } catch {}

  console.log('\n======================================================');
  console.log('3. Ejecutable generado exitosamente');
  console.log('   Carpeta: ' + outDir);
  console.log('   Archivo .exe: ' + exePath);
  console.log('======================================================');

  // Create ZIP archive for easy distribution
  console.log('\n4. Creando archivo comprimido ZIP para fácil traslado...');
  const zipPath = path.resolve(__dirname, '../release/FITNESS_LEGENDS-Windows-x64.zip');
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: 'inherit' });
    console.log('   Archivo ZIP creado en: ' + zipPath);
  } catch (zipErr) {
    console.warn('   (Aviso: No se pudo generar el ZIP automáticamente, pero la carpeta con el ejecutable está lista)');
  }

  // Create root launchers (.bat)
  const rootBatTerminal = path.resolve(__dirname, '../EJECUTAR_TERMINAL_ACCESO.bat');
  const batContentTerminal = `@echo off
title FITNESS LEGENDS - Control de Acceso
echo ============================================================
echo   Iniciando Terminal de Control de Acceso (Torniquete)
echo   FITNESS LEGENDS GYM - Version Ejecutable Nativa
echo ============================================================
start "" "%~dp0release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\ControlDeAccesoLegends.exe" --terminal
`;
  fs.writeFileSync(rootBatTerminal, batContentTerminal);

  const rootBatERP = path.resolve(__dirname, '../EJECUTAR_SISTEMA_PRINCIPAL.bat');
  const batContentERP = `@echo off
title FITNESS LEGENDS - Sistema Central ERP
echo ============================================================
echo   Iniciando Sistema Central ERP (POS, Socios, Caja, Acceso)
echo   FITNESS LEGENDS GYM - Version Ejecutable Nativa
echo ============================================================
start "" "%~dp0release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\ControlDeAccesoLegends.exe" --main
`;
  fs.writeFileSync(rootBatERP, batContentERP);

  // Also in gym leyends parent folder
  const parentBat = path.resolve(__dirname, '../../EJECUTAR_FITNESS_LEGENDS.bat');
  const parentBatContent = `@echo off
title FITNESS LEGENDS - Iniciar Sistema
echo ============================================================
echo   Iniciando FITNESS LEGENDS GYM
echo ============================================================
start "" "%~dp0LEGENDS\\release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\ControlDeAccesoLegends.exe"
`;
  try {
    fs.writeFileSync(parentBat, parentBatContent);
  } catch {}

  // Create native Windows .lnk shortcuts in root folder and Desktop
  try {
    const outIcoPath = path.join(outDir, 'resources', 'app', 'build', 'icon.ico');
    const finalIco = fs.existsSync(outIcoPath) ? outIcoPath : iconPath;
    const desktopPath = path.resolve(process.env.USERPROFILE || 'C:\\Users\\DELL', 'Desktop');

    const lnkErpDesktop = path.join(desktopPath, 'FITNESS LEGENDS - Sistema ERP.lnk');
    const lnkTerminalDesktop = path.join(desktopPath, 'FITNESS LEGENDS - Control de Acceso.lnk');
    const lnkRoot = path.resolve(__dirname, '../ControlDeAccesoLegends.lnk');

    const psCmd = `
      $wsh = New-Object -COM WScript.Shell;
      
      $sRoot = $wsh.CreateShortcut('${lnkRoot}');
      $sRoot.TargetPath = '${exePath}';
      $sRoot.WorkingDirectory = '${outDir}';
      $sRoot.IconLocation = '${finalIco},0';
      $sRoot.Description = 'FITNESS LEGENDS - Sistema ERP y Acceso';
      $sRoot.Save();

      $sErp = $wsh.CreateShortcut('${lnkErpDesktop}');
      $sErp.TargetPath = '${exePath}';
      $sErp.Arguments = '--main';
      $sErp.WorkingDirectory = '${outDir}';
      $sErp.IconLocation = '${finalIco},0';
      $sErp.Description = 'FITNESS LEGENDS - Sistema Central ERP (POS, Socios, Caja, Acceso)';
      $sErp.Save();

      $sTerm = $wsh.CreateShortcut('${lnkTerminalDesktop}');
      $sTerm.TargetPath = '${exePath}';
      $sTerm.Arguments = '--terminal';
      $sTerm.WorkingDirectory = '${outDir}';
      $sTerm.IconLocation = '${finalIco},0';
      $sTerm.Description = 'FITNESS LEGENDS - Terminal de Control de Acceso (Torniquete)';
      $sTerm.Save();
    `.replace(/\r?\n/g, ' ');

    execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'ignore' });
    console.log('   Acceso directo ERP en Escritorio creado: ' + lnkErpDesktop);
    console.log('   Acceso directo Terminal en Escritorio creado: ' + lnkTerminalDesktop);
  } catch (lnkErr) {
    console.warn('   (Aviso sobre accesos directos:', lnkErr.message, ')');
  }

  console.log('\n¡Proceso de empaquetado finalizado con éxito!\n');
}

main().catch(err => {
  console.error('Error crítico al empaquetar la aplicación:', err);
  process.exit(1);
});
