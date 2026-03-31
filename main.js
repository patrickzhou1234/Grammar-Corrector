const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// Track AHK process
let ahkProcess = null;

// Launch AutoHotkey script
function launchAHK() {
  const ahkScript = path.join(__dirname, 'GrammarCorrector.ahk');
  
  if (!fs.existsSync(ahkScript)) {
    console.error('AHK script not found:', ahkScript);
    return;
  }

  // Try common AutoHotkey installation paths
  const ahkPaths = [
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey32.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey.exe',
    'C:\\Program Files (x86)\\AutoHotkey\\AutoHotkey.exe',
  ];

  let ahkExe = null;
  for (const p of ahkPaths) {
    if (fs.existsSync(p)) {
      ahkExe = p;
      break;
    }
  }

  if (!ahkExe) {
    console.error('AutoHotkey not found. Please install AutoHotkey v2.');
    return;
  }

  console.log('Launching AHK script with:', ahkExe);
  ahkProcess = spawn(ahkExe, [ahkScript], {
    detached: false,
    stdio: 'ignore',
    cwd: __dirname
  });

  ahkProcess.on('error', (err) => {
    console.error('Failed to start AHK:', err);
  });

  ahkProcess.on('exit', (code) => {
    console.log('AHK process exited with code:', code);
    ahkProcess = null;
  });
}
const { generateDiffHtml } = require('./diff-utils');

// Persistent settings store
const store = new Store({
  defaults: {
    cookies: {
      secure1psid: '',
      secure1psidts: ''
    },
    hotkey: 'CommandOrControl+Alt+C',
    opacity: 0.92
  }
});

let overlayWindow = null;
let settingsWindow = null;
let tray = null;

// File paths for communication with AHK
const inputFile = path.join(__dirname, 'input.txt');
const responseFile = path.join(__dirname, 'response.txt');
const decisionFile = path.join(__dirname, 'decision.txt');
const triggerFile = path.join(__dirname, 'trigger.txt');

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const windowWidth = 500;
  const windowHeight = 400;

  overlayWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: screenWidth - windowWidth - 20,
    y: screenHeight - windowHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.loadFile(path.join(__dirname, 'overlay', 'index.html'));
  overlayWindow.setOpacity(store.get('opacity'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 500,
    height: 620,
    frame: false,
    transparent: true,
    resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings', 'index.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.ico');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Settings', click: () => createSettingsWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);

  tray.setToolTip('Grammar Corrector');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => createSettingsWindow());
}

function showOverlayWithThinking() {
  const overlay = createOverlayWindow();
  overlay.setOpacity(store.get('opacity'));
  
  overlay.webContents.on('did-finish-load', () => {
    overlay.webContents.send('set-thinking', true);
    overlay.showInactive();
  });
  
  if (overlay.webContents.isLoading()) {
    return;
  }
  
  overlay.webContents.send('set-thinking', true);
  overlay.showInactive();
}

function showOverlayWithDiff() {
  try {
    const originalText = fs.readFileSync(inputFile, 'utf-8');
    const correctedText = fs.readFileSync(responseFile, 'utf-8');
    const diffResult = generateDiffHtml(originalText, correctedText);

    const overlay = createOverlayWindow();
    overlay.setOpacity(store.get('opacity'));

    const sendDiff = () => {
      overlay.webContents.send('set-thinking', false);
      overlay.webContents.send('show-diff', {
        original: originalText,
        corrected: correctedText,
        diffHtml: diffResult.html,
        corrections: diffResult.corrections
      });
      // Use show() + focus() so keyboard events work for Enter/Esc navigation
      overlay.show();
      overlay.focus();
    };

    if (overlay.webContents.isLoading()) {
      overlay.webContents.on('did-finish-load', sendDiff);
    } else {
      sendDiff();
    }
  } catch (error) {
    console.error('Error showing diff:', error);
  }
}

function hideOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
}

// Watch for trigger file from AHK
function watchForTrigger() {
  const checkTrigger = () => {
    if (fs.existsSync(triggerFile)) {
      try {
        const action = fs.readFileSync(triggerFile, 'utf-8').trim();
        fs.unlinkSync(triggerFile);

        if (action === 'thinking') {
          showOverlayWithThinking();
        } else if (action === 'show') {
          showOverlayWithDiff();
        } else if (action === 'hide') {
          hideOverlay();
        }
      } catch (e) {
        // File might be locked, try again next tick
      }
    }
  };

  setInterval(checkTrigger, 100);
}

// Save cookies to .env file
function updateEnvFile() {
  const cookies = store.get('cookies');
  const envFile = path.join(__dirname, '.env');
  
  const envContent = `SECURE_1PSID=${cookies.secure1psid || ''}
SECURE_1PSIDTS=${cookies.secure1psidts || ''}
`;
  
  try {
    fs.writeFileSync(envFile, envContent, 'utf-8');
  } catch (e) {
    console.error('Failed to update .env file:', e);
  }
}

// IPC Handlers
ipcMain.handle('get-settings', () => ({
  cookies: store.get('cookies'),
  hotkey: store.get('hotkey'),
  opacity: store.get('opacity')
}));

ipcMain.handle('save-settings', (event, settings) => {
  store.set('cookies', settings.cookies);
  store.set('hotkey', settings.hotkey);
  store.set('opacity', settings.opacity);

  // Update overlay opacity live
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setOpacity(settings.opacity);
  }

  // Save cookies to .env file
  updateEnvFile();

  // Update AHK config file for hotkey
  const ahkConfigFile = path.join(__dirname, 'hotkey.txt');
  fs.writeFileSync(ahkConfigFile, settings.hotkey, 'utf-8');

  // Reload AHK script to apply new hotkey
  if (ahkProcess && !ahkProcess.killed) {
    ahkProcess.kill();
    ahkProcess = null;
  }
  setTimeout(() => {
    launchAHK();
  }, 200);

  return true;
});

ipcMain.on('accept-correction', (event, finalText) => {
  // Hide overlay FIRST so focus returns to the original app
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
  
  // Write the user's final text (with their decisions applied) to response.txt
  // This is what AHK will paste
  fs.writeFileSync(responseFile, finalText, 'utf-8');
  
  // Small delay to let focus return, then write decision file for AHK
  setTimeout(() => {
    fs.writeFileSync(decisionFile, 'accept', 'utf-8');
  }, 100);
});

ipcMain.on('reject-correction', () => {
  fs.writeFileSync(decisionFile, 'reject', 'utf-8');
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.on('close-overlay', () => {
  fs.writeFileSync(decisionFile, 'reject', 'utf-8');
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide();
  }
});

ipcMain.on('close-settings', () => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
});

// App lifecycle
app.whenReady().then(() => {
  createTray();
  watchForTrigger();
  
  // Pre-create overlay for faster display
  createOverlayWindow();
  
  // Auto-launch the AHK script
  launchAHK();
});

app.on('window-all-closed', (e) => {
  // Keep app running in tray
  e.preventDefault();
});

app.on('before-quit', () => {
  if (tray) tray.destroy();
  
  // Terminate AHK process when quitting
  if (ahkProcess && !ahkProcess.killed) {
    ahkProcess.kill();
  }
});
