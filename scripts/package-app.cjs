const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');

function runHidden(executable, args, options = {}) {
  const res = spawnSync(executable, args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    shell: false,
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 25 * 1024 * 1024,
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stdout.write(res.stderr);
  return res;
}

function syncDistForLiveReload(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 1. Copy subdirectories (e.g. assets/) and non-index.html files first so new hashed bundles exist on disk before index.html updates
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'index.html') continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyFilesRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFileWithRetry(srcPath, destPath);
    }
  }

  // 2. Atomically replace index.html last so F5 reload always sees consistent bundles
  const srcIndex = path.join(srcDir, 'index.html');
  const destIndex = path.join(destDir, 'index.html');
  if (fs.existsSync(srcIndex)) {
    const tmpIndex = destIndex + '.tmp';
    try {
      fs.copyFileSync(srcIndex, tmpIndex);
      fs.renameSync(tmpIndex, destIndex);
    } catch {
      try { fs.unlinkSync(tmpIndex); } catch {}
      copyFileWithRetry(srcIndex, destIndex);
    }
  }

  // 3. Remove obsolete hashed bundles in dest/assets/ that are not in src/assets/
  const srcAssets = path.join(srcDir, 'assets');
  const destAssets = path.join(destDir, 'assets');
  if (fs.existsSync(srcAssets) && fs.existsSync(destAssets)) {
    try {
      const keep = new Set(fs.readdirSync(srcAssets));
      for (const name of fs.readdirSync(destAssets)) {
        if (!keep.has(name)) {
          const oldPath = path.join(destAssets, name);
          try {
            if (fs.statSync(oldPath).isFile()) fs.unlinkSync(oldPath);
          } catch {}
        }
      }
    } catch {}
  }
}

function copyFileWithRetry(srcPath, destPath) {
  try {
    fs.copyFileSync(srcPath, destPath);
  } catch (err) {
    try {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
      fs.copyFileSync(srcPath, destPath);
    } catch (e) {
      console.warn(`[WARN] No se pudo sobrescribir ${destPath}:`, e.message);
    }
  }
}

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
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        try {
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
          fs.copyFileSync(srcPath, destPath);
        } catch (e) {
          console.warn(`[WARN] No se pudo sobrescribir ${destPath}:`, e.message);
        }
      }
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

function compileLaunchersOnly(rootLegendsDir, gymParentDir) {
  const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';
  const iconPath = path.join(rootLegendsDir, 'build', 'icon.ico');
  const shortcutsDir = path.join(gymParentDir, 'accesos directos');
  const backupDir = path.join(gymParentDir, '_ARCHIVOS_RESPALDO');

  if (!fs.existsSync(cscPath)) return;

  const createLauncherExe = (outputExePath, targetExeName, modeArg, profileName) => {
    const procBaseName = path.basename(targetExeName, '.exe');
    const tempCs = path.join(rootLegendsDir, 'temp_launcher.cs');
    const csCode = `
using System;
using System.IO;
using System.Text;
using System.Diagnostics;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

class Program {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    private static extern IntPtr GetThreadDesktop(uint dwThreadId);

    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool GetUserObjectInformation(IntPtr hObj, int nIndex, StringBuilder pvInfo, int nLength, out int lpnLengthNeeded);

    private const int SW_RESTORE = 9;
    private const int SW_SHOW = 5;

    private static bool IsSandboxedDesktop() {
        try {
            int needed;
            StringBuilder sb = new StringBuilder(256);
            if (GetUserObjectInformation(GetThreadDesktop(GetCurrentThreadId()), 2, sb, 256, out needed)) {
                string desk = sb.ToString().ToLowerInvariant();
                if (desk.Contains("exebox")) return true;
            }
        } catch {}
        return false;
    }

    private static IntPtr FindVisibleWindowForPids(HashSet<int> pids) {
        IntPtr foundHwnd = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            if (GetWindowTextLength(hWnd) <= 0) return true;
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pids.Contains((int)pid)) {
                StringBuilder sbClass = new StringBuilder(128);
                GetClassName(hWnd, sbClass, 128);
                string cls = sbClass.ToString();
                if (cls.Contains("Chrome_WidgetWin")) {
                    foundHwnd = hWnd;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        return foundHwnd;
    }

    [STAThread]
    static void Main(string[] args) {
        try {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] candidates = new string[] {
                Path.Combine(baseDir, "LEGENDS", "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "${targetExeName}"),
                Path.Combine(baseDir, "..", "LEGENDS", "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "${targetExeName}"),
                Path.Combine(baseDir, "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "${targetExeName}"),
                @"C:\\Users\\andre\\OneDrive\\Desktop\\gym\\LEGENDS\\release\\FITNESS_LEGENDS_TERMINAL-win32-x64\\${targetExeName}"
            };

            string target = null;
            foreach (string c in candidates) {
                try {
                    if (File.Exists(c)) {
                        target = Path.GetFullPath(c);
                        break;
                    }
                } catch {}
            }

            if (target == null || !File.Exists(target)) {
                MessageBox.Show(
                    "No se encontró el motor ejecutable en:\\n" + Path.Combine(baseDir, "LEGENDS", "release", "FITNESS_LEGENDS_TERMINAL-win32-x64", "${targetExeName}"),
                    "FITNESS LEGENDS",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            // 1. Verificar si ya existe una instancia corriendo
            Process[] existing = Process.GetProcessesByName("${procBaseName}");
            if (existing != null && existing.Length > 0) {
                HashSet<int> pids = new HashSet<int>();
                bool isRecentlyStarted = false;
                foreach (Process p in existing) {
                    try {
                        pids.Add(p.Id);
                        if ((DateTime.Now - p.StartTime).TotalSeconds < 10.0) {
                            isRecentlyStarted = true;
                        }
                    } catch {}
                }

                // Buscar ventana visible en el escritorio interactivo actual del usuario
                IntPtr visibleHwnd = FindVisibleWindowForPids(pids);
                if (visibleHwnd != IntPtr.Zero) {
                    if (IsIconic(visibleHwnd)) {
                        ShowWindow(visibleHwnd, SW_RESTORE);
                    } else {
                        ShowWindow(visibleHwnd, SW_SHOW);
                    }
                    SetForegroundWindow(visibleHwnd);
                    return;
                }

                // Si acaba de iniciar hace menos de 10 segundos, esperar a que aparezca su ventana sin matarlo
                if (isRecentlyStarted) {
                    for (int i = 0; i < 20; i++) {
                        Thread.Sleep(250);
                        visibleHwnd = FindVisibleWindowForPids(pids);
                        if (visibleHwnd != IntPtr.Zero) {
                            ShowWindow(visibleHwnd, SW_SHOW);
                            SetForegroundWindow(visibleHwnd);
                            return;
                        }
                    }
                    return;
                }

                // Si lleva más de 10 segundos sin ninguna ventana visible en el escritorio del usuario
                // (proceso huérfano/oculto en otra sesión), limpiarlo para liberar el bloqueo single-instance
                foreach (Process p in existing) {
                    try {
                        p.Kill();
                        p.WaitForExit(1500);
                    } catch {}
                }
                Thread.Sleep(250);
            }

            // Limpiar posibles archivos de bloqueo huérfanos si no hay procesos activos
            try {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                string lockFile = Path.Combine(appData, "${profileName}", "lockfile");
                if (File.Exists(lockFile)) {
                    File.Delete(lockFile);
                }
            } catch {}

            try {
                Environment.SetEnvironmentVariable("ELECTRON_RUN_AS_NODE", null);
            } catch {}

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = target;
            psi.Arguments = "${modeArg}";
            psi.WorkingDirectory = Path.GetDirectoryName(target);
            psi.UseShellExecute = true;
            psi.WindowStyle = ProcessWindowStyle.Normal;
            Process.Start(psi);
        } catch (Exception ex) {
            MessageBox.Show("Error al iniciar: " + ex.Message, "FITNESS LEGENDS", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
`;
    fs.writeFileSync(tempCs, csCode, 'utf8');
    const cscArgs = ['/nologo', '/target:winexe', '/r:System.Windows.Forms.dll', `/out:${outputExePath}`];
    if (fs.existsSync(iconPath)) {
      cscArgs.push(`/win32icon:${iconPath}`);
    }
    cscArgs.push(tempCs);
    const compileRes = runHidden(cscPath, cscArgs);
    if (compileRes.status !== 0) {
      throw new Error(`Error compilando lanzador ${outputExePath}`);
    }
    try { fs.unlinkSync(tempCs); } catch {}
    console.log('   ✓ Ejecutable creado: ' + outputExePath);
  };

  createLauncherExe(path.join(gymParentDir, 'SISTEMA_ERP.exe'), 'FitnessLegends.exe', '--main', 'FitnessLegendsERP');
  createLauncherExe(path.join(gymParentDir, 'CONTROL_DE_ACCESO.exe'), 'ControlDeAccesoLegends.exe', '--terminal', 'FitnessLegendsTerminal');

  if (fs.existsSync(shortcutsDir)) {
    createLauncherExe(path.join(shortcutsDir, '1. SISTEMA_ERP_ADMINISTRADOR.exe'), 'FitnessLegends.exe', '--main', 'FitnessLegendsERP');
    createLauncherExe(path.join(shortcutsDir, '2. TERMINAL_TORNIQUETE_ACCESO.exe'), 'ControlDeAccesoLegends.exe', '--terminal', 'FitnessLegendsTerminal');
  }

  if (fs.existsSync(backupDir)) {
    createLauncherExe(path.join(backupDir, 'FITNESS_LEGENDS_SISTEMA_ERP.exe'), 'FitnessLegends.exe', '--main', 'FitnessLegendsERP');
    createLauncherExe(path.join(backupDir, 'FITNESS_LEGENDS_TERMINAL_ACCESO.exe'), 'ControlDeAccesoLegends.exe', '--terminal', 'FitnessLegendsTerminal');
  }
}

function getExpectedLaunchers(gymParentDir) {
  const list = [
    path.join(gymParentDir, 'SISTEMA_ERP.exe'),
    path.join(gymParentDir, 'CONTROL_DE_ACCESO.exe'),
  ];
  const shortcutsDir = path.join(gymParentDir, 'accesos directos');
  if (fs.existsSync(shortcutsDir)) {
    list.push(path.join(shortcutsDir, '1. SISTEMA_ERP_ADMINISTRADOR.exe'));
    list.push(path.join(shortcutsDir, '2. TERMINAL_TORNIQUETE_ACCESO.exe'));
  }
  const backupDir = path.join(gymParentDir, '_ARCHIVOS_RESPALDO');
  if (fs.existsSync(backupDir)) {
    list.push(path.join(backupDir, 'FITNESS_LEGENDS_SISTEMA_ERP.exe'));
    list.push(path.join(backupDir, 'FITNESS_LEGENDS_TERMINAL_ACCESO.exe'));
  }
  return list;
}

async function main() {
  const rootLegendsDir = path.resolve(__dirname, '..');
  const gymParentDir = path.resolve(__dirname, '../..');

  if (process.argv.includes('--launchers-only')) {
    compileLaunchersOnly(rootLegendsDir, gymParentDir);
    return;
  }

  const nodeEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  const nodeBin = process.execPath;

  console.log('\n======================================================');
  console.log('1. Compilando TypeScript + Vite (Versión más reciente)...');
  console.log('======================================================');

  cleanDirFiles(path.join(rootLegendsDir, 'dist', 'assets'));

  const tscRes = runHidden(nodeBin, ['node_modules/typescript/bin/tsc', '-b'], {
    cwd: rootLegendsDir,
    env: nodeEnv,
  });
  if (tscRes.status !== 0) {
    throw new Error('Error en compilación TypeScript');
  }

  const viteRes = runHidden(nodeBin, ['node_modules/vite/bin/vite.js', 'build', '--emptyOutDir', 'false'], {
    cwd: rootLegendsDir,
    env: nodeEnv,
  });
  if (viteRes.status !== 0) {
    throw new Error('Error en compilación Vite');
  }

  console.log('\n======================================================');
  console.log('2. Generando versión HTML autocontenida actualizada...');
  console.log('======================================================');
  const htmlRes = runHidden(nodeBin, ['scripts/build-single-html.cjs'], {
    cwd: rootLegendsDir,
    env: nodeEnv,
  });
  if (htmlRes.status !== 0) {
    throw new Error('Error generando HTML autocontenido');
  }

  console.log('\n======================================================');
  console.log('3. Actualizando Ejecutable Nativo en release/ (Listo para F5)...');
  console.log('======================================================');

  const outDir = path.join(rootLegendsDir, 'release', 'FITNESS_LEGENDS_TERMINAL-win32-x64');
  const appDir = path.join(outDir, 'resources', 'app');

  const srcDataDir = path.join(rootLegendsDir, 'data');
  const destDataDir = path.join(appDir, 'data');
  const srcDb = path.join(srcDataDir, 'legends_database.json');
  const destDb = path.join(destDataDir, 'legends_database.json');

  // Protect live production DB in release/: never overwrite an existing legends_database.json during updates
  if (!fs.existsSync(destDataDir)) {
    fs.mkdirSync(destDataDir, { recursive: true });
  }
  if (fs.existsSync(srcDataDir)) {
    for (const entry of fs.readdirSync(srcDataDir, { withFileTypes: true })) {
      const sPath = path.join(srcDataDir, entry.name);
      const dPath = path.join(destDataDir, entry.name);
      if (entry.isFile() && entry.name === 'legends_database.json') {
        if (!fs.existsSync(destDb) && fs.existsSync(srcDb)) {
          copyFileWithRetry(srcDb, destDb);
        }
        continue;
      }
      if (entry.isDirectory()) {
        copyFilesRecursive(sPath, dPath);
      } else if (entry.isFile()) {
        copyFileWithRetry(sPath, dPath);
      }
    }
  }

  syncDistForLiveReload(path.join(rootLegendsDir, 'dist'), path.join(appDir, 'dist'));
  copyFilesRecursive(path.join(rootLegendsDir, 'electron'), path.join(appDir, 'electron'));
  copyFilesRecursive(path.join(rootLegendsDir, 'server'), path.join(appDir, 'server'));
  copyFilesRecursive(path.join(rootLegendsDir, 'build'), path.join(appDir, 'build'));
  copyFilesRecursive(path.join(rootLegendsDir, 'public'), path.join(appDir, 'public'));
  fs.copyFileSync(path.join(rootLegendsDir, 'package.json'), path.join(appDir, 'package.json'));

  const exePath = path.join(outDir, 'ControlDeAccesoLegends.exe');
  const erpExePath = path.join(outDir, 'FitnessLegends.exe');

  try {
    if (fs.existsSync(exePath) && !fs.existsSync(erpExePath)) {
      fs.copyFileSync(exePath, erpExePath);
    }
  } catch {}

  console.log('   Carpeta release actualizada: ' + outDir);
  console.log('   Ejecutable ERP:              ' + erpExePath);
  console.log('   Ejecutable Terminal:         ' + exePath);

  const missingLaunchers = getExpectedLaunchers(gymParentDir).some(p => !fs.existsSync(p));
  if (process.argv.includes('--rebuild-launchers') || missingLaunchers) {
    console.log('\n======================================================');
    console.log('4. Generando lanzadores .EXE nativos en segundo plano...');
    console.log('======================================================');
    compileLaunchersOnly(rootLegendsDir, gymParentDir);
  } else {
    console.log('\n   ✓ Lanzadores .EXE ya actualizados (omitiendo recompilación csc.exe).');
  }

  fs.writeFileSync(
    path.join(rootLegendsDir, 'EJECUTAR_TERMINAL_ACCESO.bat'),
    `@echo off\r\ntitle FITNESS LEGENDS - Control de Acceso\r\nstart "" "%~dp0..\\CONTROL_DE_ACCESO.exe"\r\n`
  );
  fs.writeFileSync(
    path.join(rootLegendsDir, 'EJECUTAR_SISTEMA_PRINCIPAL.bat'),
    `@echo off\r\ntitle FITNESS LEGENDS - Sistema Central ERP\r\nstart "" "%~dp0..\\SISTEMA_ERP.exe"\r\n`
  );

  console.log('\n¡Proceso de actualización y generación de ejecutables completado con éxito!\n');
}

main().catch(err => {
  console.error('Error crítico al empaquetar la aplicación:', err);
  process.exit(1);
});
