import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import { join } from 'path';
import Store from 'electron-store';
import { DataStore, type StoreBackend } from './dataStore';
import { ReminderManager } from './reminderManager';
import { showNotification, showStartupHighPriorityAlert, setNotificationWindow } from './notificationManager';
import { TrayManager } from './trayManager';
import { AutoLaunchManager } from './autoLaunchManager';
import { registerIpcHandlers } from './ipcHandlers';
import { initAutoUpdater } from './updater';
import { SupabaseSync } from './supabaseSync';

// Remove default menu immediately
Menu.setApplicationMenu(null);

// --- Electron-Store Backend Adapter ---

class ElectronStoreBackend implements StoreBackend {
  private store: Store;

  constructor() {
    this.store = new Store();
  }

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value as Record<string, unknown>);
  }
}

// --- Application State ---

let mainWindow: BrowserWindow | null = null;

// Initialize core services eagerly (these are fast)
const storeBackend = new ElectronStoreBackend();
const dataStore = new DataStore(storeBackend);
const reminderManager = new ReminderManager(dataStore, showNotification);
const supabaseSync = new SupabaseSync(dataStore);

// --- Window Creation ---

function createWindow(): void {
  const settings = dataStore.getSettings();
  const startMinimized = settings.startMinimized || process.argv.includes('--start-minimized');

  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      spellcheck: false,
      backgroundThrottling: true,
      enableWebSQL: false,
    },
  });

  // Window control IPC
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.on('window:close', () => mainWindow?.close());

  // Register IPC handlers before loading content
  registerIpcHandlers(dataStore, reminderManager, supabaseSync);

  // Show window as soon as it's ready - don't wait for anything else
  mainWindow.on('ready-to-show', () => {
    if (!startMinimized) mainWindow?.show();
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Load renderer
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Defer non-critical work to after window is shown
  mainWindow.once('show', () => {
    // Set notification target window
    setNotificationWindow(mainWindow!);

    // Tray
    const trayManager = new TrayManager(mainWindow!);
    trayManager.createTray();

    // Reminders
    reminderManager.rescheduleAll();

    // Startup notification
    showStartupHighPriorityAlert(dataStore.getTasks());

    // Auto-launch sync (fire and forget)
    const autoLaunchManager = new AutoLaunchManager();
    if (settings.autoLaunch) {
      autoLaunchManager.enable().catch(() => {});
    }

    // Auto-updater (checks GitHub Releases)
    initAutoUpdater(mainWindow!);
  });
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
