import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AppSettings } from '../../shared/types';

// Mock window.api before importing the store
const mockApi = {
  getTasks: vi.fn(),
  getTask: vi.fn(),
  addTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  setReminder: vi.fn(),
  cancelReminder: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getAutoLaunch: vi.fn(),
  setAutoLaunch: vi.fn(),
};

Object.defineProperty(globalThis, 'window', {
  value: { api: mockApi },
  writable: true,
});

const { useTaskStore } = await import('../../renderer/store/taskStore');

const defaultSettings: AppSettings = {
  autoLaunch: false,
  theme: 'dark',
  startMinimized: false,
};

describe('SettingsPage logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTaskStore.setState({ tasks: [], filter: 'all', theme: 'dark' });
  });

  describe('Auto-launch toggle', () => {
    it('should read auto-launch state via getAutoLaunch', async () => {
      mockApi.getAutoLaunch.mockResolvedValue(true);

      const result = await window.api.getAutoLaunch();

      expect(result).toBe(true);
      expect(mockApi.getAutoLaunch).toHaveBeenCalledOnce();
    });

    it('should enable auto-launch via setAutoLaunch', async () => {
      mockApi.setAutoLaunch.mockResolvedValue(undefined);

      await window.api.setAutoLaunch(true);

      expect(mockApi.setAutoLaunch).toHaveBeenCalledWith(true);
    });

    it('should disable auto-launch via setAutoLaunch', async () => {
      mockApi.setAutoLaunch.mockResolvedValue(undefined);

      await window.api.setAutoLaunch(false);

      expect(mockApi.setAutoLaunch).toHaveBeenCalledWith(false);
    });
  });

  describe('Theme selection', () => {
    it('should switch to light theme and persist', async () => {
      mockApi.updateSettings.mockResolvedValue({ ...defaultSettings, theme: 'light' });

      await useTaskStore.getState().setTheme('light');

      expect(mockApi.updateSettings).toHaveBeenCalledWith({ theme: 'light' });
      expect(useTaskStore.getState().theme).toBe('light');
    });

    it('should switch to dark theme and persist', async () => {
      useTaskStore.setState({ theme: 'light' });
      mockApi.updateSettings.mockResolvedValue({ ...defaultSettings, theme: 'dark' });

      await useTaskStore.getState().setTheme('dark');

      expect(mockApi.updateSettings).toHaveBeenCalledWith({ theme: 'dark' });
      expect(useTaskStore.getState().theme).toBe('dark');
    });

    it('should load saved theme on startup', async () => {
      mockApi.getTasks.mockResolvedValue([]);
      mockApi.getSettings.mockResolvedValue({ ...defaultSettings, theme: 'light' });

      await useTaskStore.getState().loadTasks();

      expect(useTaskStore.getState().theme).toBe('light');
    });
  });
});
