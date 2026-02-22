import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore, InMemoryStore } from '../../main/dataStore';
import type { ReminderManager } from '../../main/reminderManager';
import type { Reminder, Task } from '../../shared/types';

// Mock ipcMain
const handlers = new Map<string, (...args: unknown[]) => unknown>();
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      handlers.set(channel, handler);
    },
  },
}));

// Import after mock is set up
import { registerIpcHandlers } from '../../main/ipcHandlers';

function createMockReminderManager(): ReminderManager {
  return {
    scheduleReminder: vi.fn(),
    cancelReminder: vi.fn(),
    rescheduleAll: vi.fn(),
    activeJobCount: 0,
  } as unknown as ReminderManager;
}

/** Invoke a registered IPC handler (simulates ipcRenderer.invoke) */
async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`No handler for channel: ${channel}`);
  return handler({}, ...args);
}

describe('IPC Handlers', () => {
  let dataStore: DataStore;
  let reminderManager: ReturnType<typeof createMockReminderManager>;

  beforeEach(() => {
    handlers.clear();
    dataStore = new DataStore(new InMemoryStore());
    reminderManager = createMockReminderManager();
    // Register without sync (local-only mode)
    registerIpcHandlers(dataStore, reminderManager);
  });

  describe('task:getAll', () => {
    it('returns empty array when no tasks', async () => {
      expect(await invoke('task:getAll')).toEqual([]);
    });

    it('returns all tasks', async () => {
      dataStore.addTask({ title: 'Task 1' });
      dataStore.addTask({ title: 'Task 2' });
      const result = (await invoke('task:getAll')) as Task[];
      expect(result).toHaveLength(2);
    });
  });

  describe('task:get', () => {
    it('returns task by id', async () => {
      const task = dataStore.addTask({ title: 'Find me' });
      const result = (await invoke('task:get', task.id)) as Task;
      expect(result.title).toBe('Find me');
    });

    it('returns undefined for non-existent id', async () => {
      expect(await invoke('task:get', 'missing')).toBeUndefined();
    });
  });

  describe('task:add', () => {
    it('creates a task and returns it', async () => {
      const result = (await invoke('task:add', { title: 'New task' })) as Task;
      expect(result.title).toBe('New task');
      expect(result.id).toBeDefined();
    });

    it('persists the task', async () => {
      await invoke('task:add', { title: 'Persisted' });
      expect(dataStore.getTasks()).toHaveLength(1);
    });

    it('schedules reminder when task has one', async () => {
      const result = (await invoke('task:add', {
        title: 'With reminder',
        reminder: { dateTime: '2099-01-01T09:00:00Z', repeat: 'daily' },
      })) as Task;

      expect(reminderManager.scheduleReminder).toHaveBeenCalledWith(
        result.id,
        result.reminder,
      );
    });

    it('does not schedule reminder when task has none', async () => {
      await invoke('task:add', { title: 'No reminder' });
      expect(reminderManager.scheduleReminder).not.toHaveBeenCalled();
    });
  });

  describe('task:update', () => {
    it('updates task fields', async () => {
      const task = dataStore.addTask({ title: 'Original' });
      const result = (await invoke('task:update', task.id, { title: 'Updated' })) as Task;
      expect(result.title).toBe('Updated');
    });

    it('reschedules reminder when reminder is updated and enabled', async () => {
      const task = dataStore.addTask({ title: 'Task' });
      const newReminder: Reminder = {
        dateTime: '2099-06-01T09:00:00Z',
        repeat: 'weekly',
        enabled: true,
        nextTrigger: '2099-06-01T09:00:00Z',
      };
      await invoke('task:update', task.id, { reminder: newReminder });
      expect(reminderManager.scheduleReminder).toHaveBeenCalledWith(task.id, newReminder);
    });

    it('cancels reminder when reminder is updated and disabled', async () => {
      const task = dataStore.addTask({
        title: 'Task',
        reminder: { dateTime: '2099-06-01T09:00:00Z', repeat: 'once' },
      });
      const disabledReminder: Reminder = {
        dateTime: '2099-06-01T09:00:00Z',
        repeat: 'once',
        enabled: false,
        nextTrigger: '2099-06-01T09:00:00Z',
      };
      await invoke('task:update', task.id, { reminder: disabledReminder });
      expect(reminderManager.cancelReminder).toHaveBeenCalledWith(task.id);
    });

    it('does not touch reminder manager when reminder is not in updates', async () => {
      const task = dataStore.addTask({ title: 'Task' });
      await invoke('task:update', task.id, { title: 'Renamed' });
      expect(reminderManager.scheduleReminder).not.toHaveBeenCalled();
      expect(reminderManager.cancelReminder).not.toHaveBeenCalled();
    });
  });

  describe('task:delete', () => {
    it('cancels reminder and deletes task', async () => {
      const task = dataStore.addTask({ title: 'Delete me' });
      await invoke('task:delete', task.id);
      expect(reminderManager.cancelReminder).toHaveBeenCalledWith(task.id);
      expect(dataStore.getTasks()).toHaveLength(0);
    });
  });

  describe('reminder:set', () => {
    it('updates task reminder and schedules it', async () => {
      const task = dataStore.addTask({ title: 'Task' });
      const reminder: Reminder = {
        dateTime: '2099-06-01T09:00:00Z',
        repeat: 'daily',
        enabled: true,
        nextTrigger: '2099-06-01T09:00:00Z',
      };
      await invoke('reminder:set', task.id, reminder);
      const updated = dataStore.getTask(task.id)!;
      expect(updated.reminder).toEqual(reminder);
      expect(reminderManager.scheduleReminder).toHaveBeenCalledWith(task.id, reminder);
    });
  });

  describe('reminder:cancel', () => {
    it('delegates to reminderManager.cancelReminder', async () => {
      const task = dataStore.addTask({
        title: 'Task',
        reminder: { dateTime: '2099-06-01T09:00:00Z', repeat: 'once' },
      });
      await invoke('reminder:cancel', task.id);
      expect(reminderManager.cancelReminder).toHaveBeenCalledWith(task.id);
    });
  });

  describe('settings:get', () => {
    it('returns current settings', async () => {
      const settings = await invoke('settings:get');
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('autoLaunch');
    });
  });

  describe('settings:update', () => {
    it('updates and returns settings', async () => {
      const result = await invoke('settings:update', { theme: 'light' });
      expect(result).toHaveProperty('theme', 'light');
    });
  });

  describe('app:getAutoLaunch', () => {
    it('returns autoLaunch setting', async () => {
      const result = await invoke('app:getAutoLaunch');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('app:setAutoLaunch', () => {
    it('updates autoLaunch setting', async () => {
      await invoke('app:setAutoLaunch', false);
      expect(dataStore.getSettings().autoLaunch).toBe(false);
    });

    it('persists the change', async () => {
      await invoke('app:setAutoLaunch', true);
      const result = await invoke('app:getAutoLaunch');
      expect(result).toBe(true);
    });
  });

  describe('handler registration', () => {
    it('registers all expected channels', () => {
      const expectedChannels = [
        'task:getAll', 'task:get', 'task:add', 'task:update', 'task:delete', 'task:reorder',
        'reminder:set', 'reminder:cancel',
        'settings:get', 'settings:update',
        'app:getAutoLaunch', 'app:setAutoLaunch',
      ];
      for (const channel of expectedChannels) {
        expect(handlers.has(channel), `Missing handler for ${channel}`).toBe(true);
      }
    });
  });
});
