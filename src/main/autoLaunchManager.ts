import { app } from 'electron';

/**
 * AutoLaunchManager - Windows başlangıcında otomatik açılma yönetimi
 *
 * Electron'un app.setLoginItemSettings / app.getLoginItemSettings API'lerini
 * kullanarak uygulamanın Windows başlangıcında otomatik açılmasını yönetir.
 */
export class AutoLaunchManager {
  /**
   * Uygulamayı Windows başlangıcına kaydeder.
   */
  async enable(): Promise<void> {
    app.setLoginItemSettings({
      openAtLogin: true,
      args: ['--start-minimized'],
    });
  }

  /**
   * Uygulamayı Windows başlangıcından kaldırır.
   */
  async disable(): Promise<void> {
    app.setLoginItemSettings({
      openAtLogin: false,
      args: [],
    });
  }

  /**
   * Uygulamanın Windows başlangıcında açılıp açılmadığını kontrol eder.
   */
  async isEnabled(): Promise<boolean> {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  }
}
