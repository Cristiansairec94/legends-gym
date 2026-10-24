const path = require('path');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

function copyFilesRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyFilesRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanDirFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      try { fs.unlinkSync(fullPath); } catch {}
    }
  }
}

async function main() {
  try {
    execSync('taskkill /F /IM ControlDeAccesoLegends.exe /T', { stdio: 'ignore' });
  } catch {}
  try {
    execSync('taskkill /F /IM FitnessLegends.exe /T', { stdio: 'ignore' });
  } catch {}

  const rootLegendsDir = path.resolve(__dirname, '..');
  const gymParentDir = path.resolve(__dirname, '../..');
  const nodeEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  const nodeBin = process.execPath;

  console.log('\n======================================================');
  console.log('1. Compilando TypeScript + Vite (Versión más reciente)...');
  console.log('======================================================');

  cleanDirFiles(path.join(rootLegendsDir, 'dist', 'assets'));

  const tscRes = spawnSync(nodeBin, ['node_modules/typescript/bin/tsc', '-b'], {
    cwd: rootLegendsDir,
    env: nodeEnv,
    stdio: 'inherit'
  });
  if (tscRes.status !== 0) {
    throw new Error('Error en compilación TypeScript');
  }

  const viteRes = spawnSync(nodeBin, ['node_modules/vite/bin/vite.js', 'build', '--emptyOutDir', 'false'], {
    cwd: rootLegendsDir,
    env: nodeEnv,
    stdio: 'inherit'
  });
  if (viteRes.status !== 0) {
    throw new Error('Error en compilación Vite');
  }

  console.log('\n======================================================');
  console.log('2. Generando versión HTML autocontenida actualizada...');
  console.log('======================================================');
  spawnSync(nodeBin, ['scripts/build-single-html.cjs'], {
    cwd: rootLegendsDir,
    env: nodeEnv,
    stdio: 'inherit'
  });

  console.log('\n======================================================');
  console.log('3. Actualizando Ejecutable Nativo en release/...');
  console.log('======================================================');

  const outDir = path.join(rootLegendsDir, 'release', 'FITNESS_LEGENDS_TERMINAL-win32-x64');
  const appDir = path.join(outDir, 'resources', 'app');

  // Clean old hashed assets in release/resources/app/dist/assets
  cleanDirFiles(path.join(appDir, 'dist', 'assets'));

  // Sync updated build artifacts into release/resources/app
  copyFilesRecursive(path.join(rootLegendsDir, 'dist'), path.join(appDir, 'dist'));
  copyFilesRecursive(path.join(rootLegendsDir, 'electron'), path.join(appDir, 'electron'));
  copyFilesRecursive(path.join(rootLegendsDir, 'server'), path.join(appDir, 'server'));
  copyFilesRecursive(path.join(rootLegendsDir, 'data'), path.join(appDir, 'data'));
  copyFilesRecursive(path.join(rootLegendsDir, 'build'), path.join(appDir, 'build'));
  copyFilesRecursive(path.join(rootLegendsDir, 'public'), path.join(appDir, 'public'));
  fs.copyFileSync(path.join(rootLegendsDir, 'package.json'), path.join(appDir, 'package.json'));

  const exePath = path.join(outDir, 'ControlDeAccesoLegends.exe');
  const erpExePath = path.join(outDir, 'FitnessLegends.exe');
  const now = new Date();

  try {
    if (fs.existsSync(exePath)) {
      fs.utimesSync(exePath, now, now);
      fs.copyFileSync(exePath, erpExePath);
      fs.utimesSync(erpExePath, now, now);
    }
  } catch {}

  console.log('   Carpeta release actualizada: ' + outDir);
  console.log('   Ejecutable ERP:              ' + erpExePath);
  console.log('   Ejecutable Terminal:         ' + exePath);

  console.log('\n======================================================');
  console.log('4. Generando lanzadores .EXE nativos en la carpeta principal...');
  console.log('======================================================');

  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const iconPath = path.join(rootLegendsDir, 'build', 'icon.ico');

  if (fs.existsSync(cscPath)) {
    const createLauncherExe = (outputExePath, targetExeName, modeArg) => {
      const tempCs = path.join(rootLegendsDir, 'temp_launcher.cs');
      const csCode = `
using System;
using System.IO;
using System.Diagnostics;
using System.Reflection;

class Program {
    [STAThread]
    static void Main(string[] args) {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string target = Path.Combine(baseDir, "LEGENDS", "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "${targetExeName}");
        if (!File.Exists(target)) {
            target = Path.Combine(baseDir, "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "${targetExeName}");
        }
        if (File.Exists(target)) {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = target;
            psi.Arguments = "${modeArg}";
            psi.WorkingDirectory = Path.GetDirectoryName(target);
            psi.UseShellExecute = false;
            Process.Start(psi);
        }
    }
}
`;
      fs.writeFileSync(tempCs, csCode, 'utf8');
      const iconArg = fs.existsSync(iconPath) ? `"/win32icon:${iconPath}"` : '';
      execSync(`"${cscPath}" /nologo /target:winexe /out:"${outputExePath}" ${iconArg} "${tempCs}"`, { stdio: 'inherit' });
      try { fs.unlinkSync(tempCs); } catch {}
      console.log('   ✓ Ejecutable creado: ' + outputExePath);
    };

    createLauncherExe(path.join(gymParentDir, 'FITNESS_LEGENDS_SISTEMA_ERP.exe'), 'FitnessLegends.exe', '--main');
    createLauncherExe(path.join(gymParentDir, 'FITNESS_LEGENDS_TERMINAL_ACCESO.exe'), 'ControlDeAccesoLegends.exe', '--terminal');
  }

  // Update .bat launchers in LEGENDS and gym root
  fs.writeFileSync(
    path.join(rootLegendsDir, 'EJECUTAR_TERMINAL_ACCESO.bat'),
    `@echo off\r\ntitle FITNESS LEGENDS - Control de Acceso\r\nstart "" "%~dp0release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\ControlDeAccesoLegends.exe" --terminal\r\n`
  );
  fs.writeFileSync(
    path.join(rootLegendsDir, 'EJECUTAR_SISTEMA_PRINCIPAL.bat'),
    `@echo off\r\ntitle FITNESS LEGENDS - Sistema Central ERP\r\nstart "" "%~dp0release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\FitnessLegends.exe" --main\r\n`
  );
  fs.writeFileSync(
    path.join(gymParentDir, 'EJECUTAR_FITNESS_LEGENDS.bat'),
    `@echo off\r\ntitle FITNESS LEGENDS - Sistema Central ERP\r\nstart "" "%~dp0LEGENDS\\release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\FitnessLegends.exe" --main\r\n`
  );
  fs.writeFileSync(
    path.join(gymParentDir, 'EJECUTAR_TERMINAL_ACCESO.bat'),
    `@echo off\r\ntitle FITNESS LEGENDS - Terminal de Control de Acceso\r\nstart "" "%~dp0LEGENDS\\release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\ControlDeAccesoLegends.exe" --terminal\r\n`
  );

  console.log('\n¡Proceso de actualización y generación de ejecutables completado con éxito!\n');
}

main().catch(err => {
  console.error('Error crítico al empaquetar la aplicación:', err);
  process.exit(1);
});
