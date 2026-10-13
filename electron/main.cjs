const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
const appMode = process.env.APP_MODE || (process.argv.includes('--main') ? 'main' : 'terminal');
const startUrlArg = process.env.START_URL;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/logo.png');

  mainWindow = new BrowserWindow({
    width: appMode === 'terminal' ? 1180 : 1366,
    height: appMode === 'terminal' ? 840 : 860,
    minWidth: 800,
    minHeight: 650,
    title: appMode === 'terminal' 
      ? 'FITNESS LEGENDS - Terminal de Control de Acceso' 
      : 'FITNESS LEGENDS GYM - Sistema de Gestión',
    backgroundColor: '#09090b',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

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
