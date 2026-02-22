import { autoUpdater } from 'electron-updater';
import type { BrowserWindow } from 'electron';
import log from 'electron-log';
import { showOverlayNotification } from './overlayNotification';

let mainWin: BrowserWindow | null = null;

/**
 * Auto-updater for GitHub Releases.
 * Checks for updates on startup, downloads automatically, installs on quit.
 */
export function initAutoUpdater(mainWindow: BrowserWindow): void {
  mainWin = mainWindow;
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info.version);
    showOverlayNotification({
      id: `update-available-${Date.now()}`,
      title: `Güncelleme Mevcut: v${info.version}`,
      body: 'İndiriliyor...',
      priority: 'medium',
      type: 'update',
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info.version);
    showOverlayNotification({
      id: `update-ready-${Date.now()}`,
      title: 'Güncelleme Hazır',
      body: 'Uygulama kapatıldığında otomatik kurulacak.',
      priority: 'low',
      type: 'update',
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available');
  });

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err);
  });

  // Check after 3 seconds
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('Update check failed:', err);
    });
  }, 3000);
}

/** Manually check for updates — called from renderer via IPC */
export async function manualCheckForUpdates(): Promise<{ status: string; version?: string }> {
  return new Promise((resolve) => {
    const cleanup = () => {
      autoUpdater.removeListener('update-available', onAvailable);
      autoUpdater.removeListener('update-not-available', onNotAvailable);
      autoUpdater.removeListener('error', onError);
    };

    const onAvailable = (info: { version: string }) => {
      cleanup();
      resolve({ status: 'available', version: info.version });
    };

    const onNotAvailable = () => {
      cleanup();
      resolve({ status: 'up-to-date' });
    };

    const onError = (err: Error) => {
      cleanup();
      log.error('Manual update check failed:', err);
      resolve({ status: 'error' });
    };

    autoUpdater.once('update-available', onAvailable);
    autoUpdater.once('update-not-available', onNotAvailable);
    autoUpdater.once('error', onError);

    // Timeout after 15 seconds
    setTimeout(() => {
      cleanup();
      resolve({ status: 'up-to-date' });
    }, 15000);

    autoUpdater.checkForUpdates().catch((err) => {
      cleanup();
      log.error('Manual update check failed:', err);
      resolve({ status: 'error' });
    });
  });
}
