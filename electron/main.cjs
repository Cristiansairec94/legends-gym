const { app, BrowserWindow, ipcMain, globalShortcut, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.fitnesslegends.controlacceso.v2');
}

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const appMode = process.env.APP_MODE || (process.argv.includes('--main') ? 'main' : 'terminal');
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

function createWindow() {
  const appIcon = resolveAppIcon();
  const workArea = screen.getPrimaryDisplay().workAreaSize;
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
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  try {
    if (appIcon && typeof mainWindow.setIcon === 'function') {
      mainWindow.setIcon(appIcon);
    }
  } catch {}

  Menu.setApplicationMenu(null);

  const modeQuery = `?mode=${appMode}`;

  if (startUrlArg) {
    mainWindow.loadURL(startUrlArg + modeQuery);
  } else if (isDev) {
    mainWindow.loadURL(`http://localhost:5173${modeQuery}`);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath, {
      query: { mode: appMode }
    });
  }

  // F11 to toggle fullscreen / kiosk
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.on('window:toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

ipcMain.handle('window:is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
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
