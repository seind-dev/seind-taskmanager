import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- Mock Electron app module ---

const mockSetLoginItemSettings = vi.fn();
const mockGetLoginItemSettings = vi.fn();

vi.mock('electron', () => ({
  app: {
    setLoginItemSettings: (...args: unknown[]) => mockSetLoginItemSettings(...args),
    getLoginItemSettings: (...args: unknown[]) => mockGetLoginItemSettings(...args),
  },
}));

import { AutoLaunchManager } from '../../main/autoLaunchManager';

describe('AutoLaunchManager', () => {
  let manager: AutoLaunchManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new AutoLaunchManager();
  });

  describe('enable', () => {
    it('sets openAtLogin to true with --start-minimized arg', async () => {
      await manager.enable();

      expect(mockSetLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: true,
        args: ['--start-minimized'],
      });
    });
  });

  describe('disable', () => {
    it('sets openAtLogin to false', async () => {
      await manager.disable();

      expect(mockSetLoginItemSettings).toHaveBeenCalledWith({
        openAtLogin: false,
        args: [],
      });
    });
  });

  describe('isEnabled', () => {
    it('returns true when openAtLogin is true', async () => {
      mockGetLoginItemSettings.mockReturnValue({ openAtLogin: true });

      const result = await manager.isEnabled();

      expect(result).toBe(true);
      expect(mockGetLoginItemSettings).toHaveBeenCalled();
    });

    it('returns false when openAtLogin is false', async () => {
      mockGetLoginItemSettings.mockReturnValue({ openAtLogin: false });

      const result = await manager.isEnabled();

      expect(result).toBe(false);
    });
  });
});
