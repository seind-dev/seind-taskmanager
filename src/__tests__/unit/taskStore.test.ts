import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Task, AppSettings } from '../../shared/types';

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

// Import store after mocking window.api
const { useTaskStore } = await import('../../renderer/store/taskStore');

const sampleTask: Task = {
  id: '1',
  title: 'Test görevi',
  priority: 'high',
  status: 'pending',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const defaultSettings: AppSettings = {
  autoLaunch: false,
  theme: 'dark',
  startMinimized: false,
};

describe('TaskStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTaskStore.setState({ tasks: [], filter: 'all', theme: 'dark' });
  });

  describe('loadTasks', () => {
    it('should load tasks and theme from main process', async () => {
      mockApi.getTasks.mockResolvedValue([sampleTask]);
      mockApi.getSettings.mockResolvedValue({ ...defaultSettings, theme: 'light' });

      await useTaskStore.getState().loadTasks();

      const state = useTaskStore.getState();
      expect(state.tasks).toEqual([sampleTask]);
      expect(state.theme).toBe('light');
      expect(mockApi.getTasks).toHaveBeenCalledOnce();
      expect(mockApi.getSettings).toHaveBeenCalledOnce();
    });

    it('should load empty task list', async () => {
      mockApi.getTasks.mockResolvedValue([]);
      mockApi.getSettings.mockResolvedValue(defaultSettings);

      await useTaskStore.getState().loadTasks();

      expect(useTaskStore.getState().tasks).toEqual([]);
    });
  });

  describe('addTask', () => {
    it('should call addTask API and refresh task list', async () => {
      const newTask = { ...sampleTask, id: '2', title: 'Yeni görev' };
      mockApi.addTask.mockResolvedValue(newTask);
      mockApi.getTasks.mockResolvedValue([sampleTask, newTask]);

      await useTaskStore.getState().addTask({ title: 'Yeni görev', priority: 'high' });

      expect(mockApi.addTask).toHaveBeenCalledWith({ title: 'Yeni görev', priority: 'high' });
      expect(useTaskStore.getState().tasks).toHaveLength(2);
    });
  });

  describe('updateTask', () => {
    it('should call updateTask API and refresh task list', async () => {
      const updated = { ...sampleTask, title: 'Güncellenmiş' };
      mockApi.updateTask.mockResolvedValue(updated);
      mockApi.getTasks.mockResolvedValue([updated]);

      await useTaskStore.getState().updateTask('1', { title: 'Güncellenmiş' });

      expect(mockApi.updateTask).toHaveBeenCalledWith('1', { title: 'Güncellenmiş' });
      expect(useTaskStore.getState().tasks[0].title).toBe('Güncellenmiş');
    });
  });

  describe('deleteTask', () => {
    it('should call deleteTask API and refresh task list', async () => {
      mockApi.deleteTask.mockResolvedValue(undefined);
      mockApi.getTasks.mockResolvedValue([]);

      useTaskStore.setState({ tasks: [sampleTask] });

      await useTaskStore.getState().deleteTask('1');

      expect(mockApi.deleteTask).toHaveBeenCalledWith('1');
      expect(useTaskStore.getState().tasks).toEqual([]);
    });
  });

  describe('setFilter', () => {
    it('should update filter locally without IPC call', () => {
      useTaskStore.getState().setFilter('high');

      expect(useTaskStore.getState().filter).toBe('high');
      expect(mockApi.getTasks).not.toHaveBeenCalled();
    });

    it('should support all filter values', () => {
      const filters = ['all', 'high', 'medium', 'low'] as const;
      for (const f of filters) {
        useTaskStore.getState().setFilter(f);
        expect(useTaskStore.getState().filter).toBe(f);
      }
    });
  });

  describe('setTheme', () => {
    it('should update theme and persist via IPC', async () => {
      mockApi.updateSettings.mockResolvedValue({ ...defaultSettings, theme: 'light' });

      await useTaskStore.getState().setTheme('light');

      expect(mockApi.updateSettings).toHaveBeenCalledWith({ theme: 'light' });
      expect(useTaskStore.getState().theme).toBe('light');
    });
  });
});
