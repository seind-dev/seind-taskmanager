import { ipcMain } from 'electron';
import type { DataStore } from './dataStore';
import type { ReminderManager } from './reminderManager';
import type { SupabaseSync } from './supabaseSync';
import type { CreateTaskDTO, Reminder, Task, AppSettings } from '../shared/types';
import { manualCheckForUpdates } from './updater';

/**
 * Registers all IPC handlers.
 * Uses SupabaseSync for task operations (cloud + local),
 * DataStore directly for settings (local only).
 */
export function registerIpcHandlers(
  dataStore: DataStore,
  reminderManager: ReminderManager,
  sync?: SupabaseSync,
): void {
  // --- Task Handlers (via Supabase sync if available) ---

  ipcMain.handle('task:getAll', async (): Promise<Task[]> => {
    if (sync) return sync.getTasks();
    return dataStore.getTasks();
  });

  ipcMain.handle('task:get', async (_event, id: string): Promise<Task | undefined> => {
    if (sync) return sync.getTask(id);
    return dataStore.getTask(id);
  });

  ipcMain.handle('task:add', async (_event, data: CreateTaskDTO): Promise<Task> => {
    const task = sync ? await sync.addTask(data) : dataStore.addTask(data);
    if (task.reminder?.enabled) {
      reminderManager.scheduleReminder(task.id, task.reminder);
    }
    return task;
  });

  ipcMain.handle('task:update', async (_event, id: string, updates: Partial<Task>): Promise<Task> => {
    const updated = sync ? await sync.updateTask(id, updates) : dataStore.updateTask(id, updates);
    if (updates.reminder !== undefined) {
      if (updated.reminder?.enabled) {
        reminderManager.scheduleReminder(id, updated.reminder);
      } else {
        reminderManager.cancelReminder(id);
      }
    }
    return updated;
  });

  ipcMain.handle('task:delete', async (_event, id: string): Promise<void> => {
    reminderManager.cancelReminder(id);
    if (sync) await sync.deleteTask(id);
    else dataStore.deleteTask(id);
  });

  ipcMain.handle('task:reorder', async (_event, orderedIds: string[]): Promise<void> => {
    if (sync) await sync.reorderTasks(orderedIds);
    else dataStore.reorderTasks(orderedIds);
  });

  // --- Reminder Handlers ---

  ipcMain.handle('reminder:set', (_event, taskId: string, reminder: Reminder): void => {
    dataStore.updateTask(taskId, { reminder });
    reminderManager.scheduleReminder(taskId, reminder);
  });

  ipcMain.handle('reminder:cancel', (_event, taskId: string): void => {
    reminderManager.cancelReminder(taskId);
  });

  // --- Settings Handlers (local only) ---

  ipcMain.handle('settings:get', (): AppSettings => {
    return dataStore.getSettings();
  });

  ipcMain.handle('settings:update', (_event, settings: Partial<AppSettings>): AppSettings => {
    return dataStore.updateSettings(settings);
  });

  ipcMain.handle('app:getAutoLaunch', (): boolean => {
    return dataStore.getSettings().autoLaunch;
  });

  ipcMain.handle('app:setAutoLaunch', (_event, enabled: boolean): void => {
    dataStore.updateSettings({ autoLaunch: enabled });
  });

  // --- Update Handler ---
  ipcMain.handle('app:checkForUpdates', async () => {
    return manualCheckForUpdates();
  });
}
