import { describe, it, expect, beforeEach } from 'vitest';
import { DataStore, InMemoryStore, DEFAULT_SETTINGS } from '../../main/dataStore';
import type { CreateTaskDTO } from '../../shared/types';

describe('DataStore', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore(new InMemoryStore());
  });

  // --- Task CRUD ---

  describe('getTasks', () => {
    it('returns empty array when no tasks exist', () => {
      expect(store.getTasks()).toEqual([]);
    });
  });

  describe('addTask', () => {
    it('creates a task with generated id and timestamps', () => {
      const task = store.addTask({ title: 'Test task' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test task');
      expect(task.status).toBe('pending');
      expect(task.priority).toBe('low');
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('trims the title', () => {
      const task = store.addTask({ title: '  spaced title  ' });
      expect(task.title).toBe('spaced title');
    });

    it('defaults priority to low when not specified', () => {
      const task = store.addTask({ title: 'No priority' });
      expect(task.priority).toBe('low');
    });

    it('uses provided priority when specified', () => {
      const task = store.addTask({ title: 'High', priority: 'high' });
      expect(task.priority).toBe('high');
    });

    it('defaults status to pending', () => {
      const task = store.addTask({ title: 'New task' });
      expect(task.status).toBe('pending');
    });

    it('stores optional description', () => {
      const task = store.addTask({ title: 'With desc', description: 'Details' });
      expect(task.description).toBe('Details');
    });

    it('stores reminder with enabled=true and nextTrigger set', () => {
      const dto: CreateTaskDTO = {
        title: 'Reminder task',
        reminder: { dateTime: '2025-06-01T09:00:00Z', repeat: 'daily' },
      };
      const task = store.addTask(dto);

      expect(task.reminder).toBeDefined();
      expect(task.reminder!.enabled).toBe(true);
      expect(task.reminder!.nextTrigger).toBe('2025-06-01T09:00:00Z');
      expect(task.reminder!.repeat).toBe('daily');
    });

    it('persists task to store', () => {
      const task = store.addTask({ title: 'Persisted' });
      const tasks = store.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(task.id);
    });
  });

  // --- Title Validation ---

  describe('title validation', () => {
    it('rejects empty title', () => {
      expect(() => store.addTask({ title: '' })).toThrow('Task title cannot be empty');
    });

    it('rejects whitespace-only title', () => {
      expect(() => store.addTask({ title: '   ' })).toThrow('Task title cannot be empty');
    });

    it('rejects tab-only title', () => {
      expect(() => store.addTask({ title: '\t\t' })).toThrow('Task title cannot be empty');
    });

    it('does not add task to store on validation failure', () => {
      try { store.addTask({ title: '' }); } catch { /* expected */ }
      expect(store.getTasks()).toHaveLength(0);
    });
  });

  // --- getTask ---

  describe('getTask', () => {
    it('returns task by id', () => {
      const created = store.addTask({ title: 'Find me' });
      const found = store.getTask(created.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe('Find me');
    });

    it('returns undefined for non-existent id', () => {
      expect(store.getTask('non-existent')).toBeUndefined();
    });
  });

  // --- updateTask ---

  describe('updateTask', () => {
    it('updates specified fields', () => {
      const task = store.addTask({ title: 'Original' });
      const updated = store.updateTask(task.id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
    });

    it('updates updatedAt timestamp', () => {
      const task = store.addTask({ title: 'Timestamp test' });
      const originalUpdatedAt = task.updatedAt;

      // Small delay to ensure different timestamp
      const updated = store.updateTask(task.id, { priority: 'high' });
      expect(updated.updatedAt).toBeDefined();
      // updatedAt should be >= original (could be same if very fast)
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('preserves unchanged fields', () => {
      const task = store.addTask({ title: 'Keep me', description: 'Original desc' });
      const updated = store.updateTask(task.id, { priority: 'high' });
      expect(updated.title).toBe('Keep me');
      expect(updated.description).toBe('Original desc');
    });

    it('does not allow overwriting id', () => {
      const task = store.addTask({ title: 'ID test' });
      const updated = store.updateTask(task.id, { id: 'hacked' } as any);
      expect(updated.id).toBe(task.id);
    });

    it('does not allow overwriting createdAt', () => {
      const task = store.addTask({ title: 'CreatedAt test' });
      const updated = store.updateTask(task.id, { createdAt: '1999-01-01T00:00:00Z' } as any);
      expect(updated.createdAt).toBe(task.createdAt);
    });

    it('persists update to store', () => {
      const task = store.addTask({ title: 'Persist update' });
      store.updateTask(task.id, { title: 'Persisted' });
      expect(store.getTask(task.id)!.title).toBe('Persisted');
    });

    it('throws for non-existent task', () => {
      expect(() => store.updateTask('missing', { title: 'Nope' })).toThrow('Task not found');
    });
  });

  // --- deleteTask ---

  describe('deleteTask', () => {
    it('removes task from store', () => {
      const task = store.addTask({ title: 'Delete me' });
      store.deleteTask(task.id);
      expect(store.getTasks()).toHaveLength(0);
    });

    it('only removes the specified task', () => {
      const t1 = store.addTask({ title: 'Keep' });
      const t2 = store.addTask({ title: 'Delete' });
      store.deleteTask(t2.id);
      const tasks = store.getTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe(t1.id);
    });

    it('throws for non-existent task', () => {
      expect(() => store.deleteTask('missing')).toThrow('Task not found');
    });
  });

  // --- Settings ---

  describe('getSettings', () => {
    it('returns default settings when none are stored', () => {
      expect(store.getSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('updateSettings', () => {
    it('updates partial settings', () => {
      const updated = store.updateSettings({ theme: 'light' });
      expect(updated.theme).toBe('light');
      expect(updated.autoLaunch).toBe(false); // preserved default
    });

    it('persists settings', () => {
      store.updateSettings({ theme: 'light' });
      expect(store.getSettings().theme).toBe('light');
    });

    it('merges multiple updates', () => {
      store.updateSettings({ theme: 'light' });
      store.updateSettings({ autoLaunch: false });
      const settings = store.getSettings();
      expect(settings.theme).toBe('light');
      expect(settings.autoLaunch).toBe(false);
    });
  });
});
