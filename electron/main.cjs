const { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Global stability guards: prevent uncaught errors (e.g. OneDrive file locks or network resets) from closing the app
process.on('uncaughtException', (err) => {
  console.error('[MAIN UNCAUGHT EXCEPTION]', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[MAIN UNHANDLED REJECTION]', reason);
});

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const exeName = (process.execPath || '').toLowerCase();
const detectedMode = (exeName.includes('control') || exeName.includes('terminal')) ? 'terminal' : 'main';
const appMode = process.env.APP_MODE || (process.argv.includes('--terminal') ? 'terminal' : (process.argv.includes('--main') ? 'main' : detectedMode));
process.env.APP_MODE = appMode;

// Configure separate userData and profile so ERP and Terminal can run simultaneously without disk cache lock conflict
const profileName = appMode === 'terminal' ? 'FitnessLegendsTerminal' : 'FitnessLegendsERP';
app.setName(profileName);
const appDataPath = app.getPath('appData');
const userDataDir = path.join(appDataPath, profileName);
try {
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
} catch {}
app.setPath('userData', userDataDir);
app.commandLine.appendSwitch('user-data-dir', userDataDir);
app.commandLine.appendSwitch('disk-cache-dir', path.join(userDataDir, 'Cache'));

if (process.platform === 'win32') {
  app.setAppUserModelId(`com.fitnesslegends.${appMode}.v2`);
}

// Request single-instance lock scoped to this specific application mode
const gotSingleInstanceLock = app.requestSingleInstanceLock({ mode: appMode });

// Performance and crash-resilience switches
app.commandLine.appendSwitch('disable-http-cache');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

let mainWindow = null;
let isQuitting = false;
const startUrlArg = process.env.START_URL;

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, '../build/icon.ico'),
    path.join(__dirname, '../public/favicon.ico'),
    path.join(__dirname, '../public/logo.png'),
    path.join(__dirname, '../dist/logo.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const img = nativeImage.createFromPath(p);
      if (!img.isEmpty()) return img;
    }
  }
  return path.join(__dirname, '../public/logo.png');
}

function loadAppContent(win) {
  if (!win || win.isDestroyed()) return;
  const modeQuery = `?mode=${appMode}`;

  if (startUrlArg) {
    win.loadURL(startUrlArg + modeQuery).catch((err) => {
      console.error('[LOAD-URL ERROR]', err.message);
    });
  } else if (isDev) {
    win.loadURL(`http://localhost:5173${modeQuery}`).catch((err) => {
      console.error('[LOAD-DEV-URL ERROR]', err.message);
    });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    win.loadFile(indexPath, {
      query: { mode: appMode }
    }).catch((err) => {
      console.error('[LOAD-FILE ERROR]', err.message);
    });
  }
}

function createWindow() {
  const appIcon = resolveAppIcon();
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay ? primaryDisplay.workAreaSize : { width: 1366, height: 768 };
  const winWidth = Math.min(1280, Math.round(workArea.width * 0.92));
  const winHeight = Math.min(820, Math.round(workArea.height * 0.94));

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    minWidth: 760,
    minHeight: 560,
    center: true,
    title: appMode === 'terminal'
      ? 'FITNESS LEGENDS - Terminal de Control de Acceso'
      : 'FITNESS LEGENDS GYM - Sistema de Gestión',
    backgroundColor: '#09090b',
    icon: appIcon,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  }, 1000);

  try {
    if (appIcon && typeof mainWindow.setIcon === 'function') {
      mainWindow.setIcon(appIcon);
    }
  } catch {}

  Menu.setApplicationMenu(null);

  // Prevent stray secondary Electron windows from spawning; open genuine external links in OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url && /^https?:\/\//i.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (e, errorCode, errorDescription, validatedURL) => {
    console.error(`[DID-FAIL-LOAD] ${errorCode}: ${errorDescription} at ${validatedURL}`);
    // Retry loading if an initial file/asset read failed transiently
    if (errorCode !== -3) { // -3 is ERR_ABORTED
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          loadAppContent(mainWindow);
        }
      }, 1000);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log(`[DID-FINISH-LOAD] URL: ${mainWindow.webContents.getURL()}`);
    }
  });

  // Auto-recover if the renderer process ever crashes unexpectedly
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error(`[RENDER-PROCESS-GONE] reason=${details.reason} exitCode=${details.exitCode}`);
    if (!isQuitting && details.reason !== 'clean-exit') {
      setTimeout(() => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.reload();
          } else if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
          }
        } catch (err) {
          console.error('[RECOVERY ERROR]', err);
        }
      }, 600);
    }
  });

  mainWindow.on('unresponsive', () => {
    console.warn('[WINDOW UNRESPONSIVE] Esperando respuesta del motor gráfico...');
  });

  loadAppContent(mainWindow);

  // Fullscreen event notifications to renderer
  mainWindow.on('enter-full-screen', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window:fullscreen-changed', true);
      }
    } catch {}
  });
  mainWindow.on('leave-full-screen', () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window:fullscreen-changed', false);
      }
    } catch {}
  });

  // Global key events (F11 and ESCAPE to toggle/exit fullscreen, F5 / Ctrl+R to reload with fresh cache, F12 DevTools)
  const performHardReload = () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const wc = mainWindow.webContents;
    const ses = wc.session;
    Promise.allSettled([
      ses.clearCache(),
      typeof ses.clearCodeCaches === 'function' ? ses.clearCodeCaches({}) : Promise.resolve(),
    ]).finally(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        wc.reloadIgnoringCache();
      }
    });
  };

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (input.type === 'keyDown') {
      if (input.key === 'F11') {
        event.preventDefault();
        if (!input.isAutoRepeat) {
          setBorderlessFullscreen(!mainWindow.isFullScreen());
        }
      } else if (input.key === 'Escape') {
        if (mainWindow.isFullScreen()) {
          setBorderlessFullscreen(false);
          event.preventDefault();
        }
      } else if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
        event.preventDefault();
        if (!input.isAutoRepeat) {
          performHardReload();
        }
      } else if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow.webContents.toggleDevTools();
        event.preventDefault();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setBorderlessFullscreen(enabled) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (enabled) {
    try { mainWindow.setMenuBarVisibility(false); } catch {}
  }
  mainWindow.setFullScreen(Boolean(enabled));
  try { mainWindow.webContents.send('window:fullscreen-changed', Boolean(enabled)); } catch {}
}

// IPC Handlers
ipcMain.on('window:toggle-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    setBorderlessFullscreen(!mainWindow.isFullScreen());
  }
});

ipcMain.on('window:exit-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFullScreen()) {
    setBorderlessFullscreen(false);
  }
});

ipcMain.on('window:enter-fullscreen', () => {
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isFullScreen()) {
    setBorderlessFullscreen(true);
  }
});

ipcMain.on('window:reload', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const wc = mainWindow.webContents;
    wc.session.clearCache().catch(() => {}).finally(() => {
      if (mainWindow && !mainWindow.isDestroyed()) wc.reloadIgnoringCache();
    });
  }
});

ipcMain.on('window:hard-reload', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const wc = mainWindow.webContents;
    wc.session.clearCache().catch(() => {}).finally(() => {
      if (mainWindow && !mainWindow.isDestroyed()) wc.reloadIgnoringCache();
    });
  }
});

ipcMain.handle('window:is-fullscreen', () => {
  return (mainWindow && !mainWindow.isDestroyed()) ? mainWindow.isFullScreen() : false;
});

ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else if (app.isReady()) {
      createWindow();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
  });

  app.whenReady().then(() => {
    // Ensure sync server is active on port 3001
    try {
      const syncServer = require('../server/syncServer.cjs');
      if (syncServer && typeof syncServer.startServer === 'function') {
        syncServer.startServer(3001);
      }
    } catch (err) {
      console.log('[MAIN] Servidor de sincronización embebido omitido o activo:', err.message);
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
