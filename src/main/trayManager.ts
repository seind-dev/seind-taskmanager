import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';

/**
 * TrayManager - Sistem tepsisi ikonu ve menüsü yönetimi
 *
 * Pencereyi göster/gizle işlevselliği ve
 * pencere kapatma yerine tepsiye küçültme davranışı sağlar.
 */
export class TrayManager {
  private tray: Tray | null = null;
  private window: BrowserWindow;
  private isQuitting = false;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  /**
   * Sistem tepsisi ikonu ve bağlam menüsünü oluşturur.
   * Pencere kapatma davranışını tepsiye küçültme olarak ayarlar.
   */
  createTray(): void {
    const icon = this.createTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Görev Yöneticisi');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Göster',
        click: () => this.showWindow(),
      },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          this.isQuitting = true;
          app.quit();
        },
      },
    ]);

    this.tray.setContextMenu(contextMenu);

    // Tray ikonuna çift tıklama ile pencereyi göster
    this.tray.on('double-click', () => this.showWindow());

    // Pencere kapatma yerine tepsiye küçültme
    this.window.on('close', (event) => {
      if (!this.isQuitting) {
        event.preventDefault();
        this.hideToTray();
      }
    });

    // Uygulama kapanırken isQuitting flag'ini ayarla
    app.on('before-quit', () => {
      this.isQuitting = true;
    });
  }

  /**
   * Bekleyen görev sayısını tray tooltip'inde günceller.
   */
  updateBadge(pendingCount: number): void {
    if (!this.tray) return;

    if (pendingCount > 0) {
      this.tray.setToolTip(`Görev Yöneticisi - ${pendingCount} bekleyen görev`);
    } else {
      this.tray.setToolTip('Görev Yöneticisi');
    }
  }

  /**
   * Ana pencereyi gösterir ve öne getirir.
   */
  showWindow(): void {
    if (this.window.isMinimized()) {
      this.window.restore();
    }
    this.window.show();
    this.window.focus();
  }

  /**
   * Ana pencereyi gizleyerek sistem tepsisine küçültür.
   */
  hideToTray(): void {
    this.window.hide();
  }

  /**
   * 16x16 basit bir tray ikonu oluşturur (nativeImage ile).
   */
  private createTrayIcon(): Electron.NativeImage {
    // 16x16 basit bir ikon - mavi kare ile görev simgesi
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA' +
      'RklEQVQ4T2NkoBAwUqifYdQABuq7gJGRkRFdM7oYIx4XEOsF' +
      'YlxhYGBgYCTWAJBmRkZGRpAYSAwkBhIjxgCQOFgYAABbhAkR' +
      'wMgJzgAAAABJRU5ErkJggg=='
    );
    return icon;
  }

  /**
   * Tray'i temizler (uygulama kapanırken).
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  /** Test amaçlı: isQuitting durumunu döndürür */
  get quitting(): boolean {
    return this.isQuitting;
  }
}
