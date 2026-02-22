import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock Electron modules before importing TrayManager ---

const mockTrayInstance = {
  setToolTip: vi.fn(),
  setContextMenu: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
};

const mockMenuBuildFromTemplate = vi.fn().mockReturnValue('mock-menu');

vi.mock('electron', () => ({
  app: {
    quit: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: vi.fn(),
  Menu: {
    buildFromTemplate: (...args: unknown[]) => mockMenuBuildFromTemplate(...args),
  },
  Tray: vi.fn().mockImplementation(() => mockTrayInstance),
  nativeImage: {
    createFromDataURL: vi.fn().mockReturnValue('mock-icon'),
  },
}));

import { app } from 'electron';
import { TrayManager } from '../../main/trayManager';

// --- Fake BrowserWindow ---

function createFakeWindow() {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    isMinimized: vi.fn().mockReturnValue(false),
    restore: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    focus: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(handler);
    }),
    // Helper to simulate events in tests
    _emit(event: string, ...args: unknown[]) {
      listeners[event]?.forEach((h) => h(...args));
    },
    _listeners: listeners,
  };
}

describe('TrayManager', () => {
  let fakeWindow: ReturnType<typeof createFakeWindow>;
  let manager: TrayManager;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeWindow = createFakeWindow();
    manager = new TrayManager(fakeWindow as unknown as Electron.BrowserWindow);
  });

  describe('createTray', () => {
    it('creates a tray icon with tooltip', () => {
      manager.createTray();
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Görev Yöneticisi');
    });

    it('sets a context menu with Göster and Çıkış items', () => {
      manager.createTray();
      expect(mockMenuBuildFromTemplate).toHaveBeenCalledTimes(1);

      const template = mockMenuBuildFromTemplate.mock.calls[0][0];
      const labels = template.map((item: { label?: string; type?: string }) => item.label || item.type);
      expect(labels).toContain('Göster');
      expect(labels).toContain('Çıkış');
    });

    it('assigns the context menu to the tray', () => {
      manager.createTray();
      expect(mockTrayInstance.setContextMenu).toHaveBeenCalledWith('mock-menu');
    });

    it('registers double-click handler on tray', () => {
      manager.createTray();
      const doubleClickCall = mockTrayInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'double-click'
      );
      expect(doubleClickCall).toBeDefined();
    });

    it('registers close handler on window for hide-to-tray', () => {
      manager.createTray();
      expect(fakeWindow.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('registers before-quit handler on app', () => {
      manager.createTray();
      expect(app.on).toHaveBeenCalledWith('before-quit', expect.any(Function));
    });
  });

  describe('showWindow', () => {
    it('shows and focuses the window', () => {
      manager.showWindow();
      expect(fakeWindow.show).toHaveBeenCalled();
      expect(fakeWindow.focus).toHaveBeenCalled();
    });

    it('restores the window if minimized', () => {
      fakeWindow.isMinimized.mockReturnValue(true);
      manager.showWindow();
      expect(fakeWindow.restore).toHaveBeenCalled();
      expect(fakeWindow.show).toHaveBeenCalled();
    });

    it('does not restore if not minimized', () => {
      fakeWindow.isMinimized.mockReturnValue(false);
      manager.showWindow();
      expect(fakeWindow.restore).not.toHaveBeenCalled();
    });
  });

  describe('hideToTray', () => {
    it('hides the window', () => {
      manager.hideToTray();
      expect(fakeWindow.hide).toHaveBeenCalled();
    });
  });

  describe('updateBadge', () => {
    it('updates tooltip with pending count when > 0', () => {
      manager.createTray();
      vi.clearAllMocks();

      manager.updateBadge(5);
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith(
        'Görev Yöneticisi - 5 bekleyen görev'
      );
    });

    it('resets tooltip when pending count is 0', () => {
      manager.createTray();
      vi.clearAllMocks();

      manager.updateBadge(0);
      expect(mockTrayInstance.setToolTip).toHaveBeenCalledWith('Görev Yöneticisi');
    });

    it('does nothing if tray is not created', () => {
      manager.updateBadge(3);
      expect(mockTrayInstance.setToolTip).not.toHaveBeenCalled();
    });
  });

  describe('close-to-tray behavior', () => {
    it('prevents window close and hides to tray when not quitting', () => {
      manager.createTray();

      const closeHandler = fakeWindow.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      )![1] as (event: { preventDefault: () => void }) => void;

      const event = { preventDefault: vi.fn() };
      closeHandler(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(fakeWindow.hide).toHaveBeenCalled();
    });

    it('allows window close when quitting', () => {
      manager.createTray();

      // Simulate before-quit to set isQuitting
      const beforeQuitHandler = (app.on as ReturnType<typeof vi.fn>).mock.calls.find(
        (call: unknown[]) => call[0] === 'before-quit'
      )![1] as () => void;
      beforeQuitHandler();

      const closeHandler = fakeWindow.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'close'
      )![1] as (event: { preventDefault: () => void }) => void;

      const event = { preventDefault: vi.fn() };
      closeHandler(event);

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(fakeWindow.hide).not.toHaveBeenCalled();
    });
  });

  describe('context menu actions', () => {
    it('Göster menu item calls showWindow', () => {
      manager.createTray();

      const template = mockMenuBuildFromTemplate.mock.calls[0][0];
      const showItem = template.find((item: { label?: string }) => item.label === 'Göster');

      showItem.click();
      expect(fakeWindow.show).toHaveBeenCalled();
      expect(fakeWindow.focus).toHaveBeenCalled();
    });

    it('Çıkış menu item quits the app', () => {
      manager.createTray();

      const template = mockMenuBuildFromTemplate.mock.calls[0][0];
      const quitItem = template.find((item: { label?: string }) => item.label === 'Çıkış');

      quitItem.click();
      expect(app.quit).toHaveBeenCalled();
    });

    it('Çıkış sets quitting flag before quitting', () => {
      manager.createTray();

      const template = mockMenuBuildFromTemplate.mock.calls[0][0];
      const quitItem = template.find((item: { label?: string }) => item.label === 'Çıkış');

      quitItem.click();
      expect(manager.quitting).toBe(true);
    });
  });

  describe('double-click on tray', () => {
    it('shows the window on double-click', () => {
      manager.createTray();

      const doubleClickHandler = mockTrayInstance.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'double-click'
      )![1] as () => void;

      doubleClickHandler();
      expect(fakeWindow.show).toHaveBeenCalled();
      expect(fakeWindow.focus).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('destroys the tray icon', () => {
      manager.createTray();
      manager.destroy();
      expect(mockTrayInstance.destroy).toHaveBeenCalled();
    });

    it('handles destroy when tray is not created', () => {
      expect(() => manager.destroy()).not.toThrow();
    });
  });
});
