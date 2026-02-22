import { app, ipcMain, BrowserWindow } from 'electron';
import type { DataStore } from './dataStore';
import type { ReminderManager } from './reminderManager';
import type { SupabaseSync } from './supabaseSync';
import type { CreateTaskDTO, Reminder, Task, AppSettings, AuthResult } from '../shared/types';
import { manualCheckForUpdates } from './updater';
import { signOut, getSession, supabase, getCurrentUserId, getDiscordOAuthUrl, setSessionFromTokens } from './supabaseClient';

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
  // --- Auth Handlers ---

  ipcMain.handle('auth:signInWithDiscord', async (): Promise<AuthResult> => {
    return new Promise((resolve) => {
      getDiscordOAuthUrl().then((oauthUrl) => {
        const authWindow = new BrowserWindow({
          width: 500,
          height: 700,
          show: true,
          frame: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });

        authWindow.setMenuBarVisibility(false);

        let resolved = false;

        // Monitor URL changes to catch the callback with tokens
        const handleNavigation = async (url: string) => {
          if (resolved) return;
          try {
            // After Discord auth, Supabase redirects with hash containing tokens
            if (url.includes('access_token=') && url.includes('refresh_token=')) {
              const hashPart = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
              if (!hashPart) return;

              const params = new URLSearchParams(hashPart);
              const accessToken = params.get('access_token');
              const refreshToken = params.get('refresh_token');

              if (accessToken && refreshToken) {
                resolved = true;
                try {
                  const data = await setSessionFromTokens(accessToken, refreshToken);
                  authWindow.close();
                  resolve({
                    success: true,
                    userId: data.user?.id,
                    email: data.user?.email ?? undefined,
                  });
                } catch (err: unknown) {
                  authWindow.close();
                  resolve({ success: false, error: (err as Error).message });
                }
              }
            }
          } catch {
            // ignore parse errors
          }
        };

        authWindow.webContents.on('will-redirect', (_event, url) => handleNavigation(url));
        authWindow.webContents.on('did-navigate', (_event, url) => handleNavigation(url));
        authWindow.webContents.on('did-navigate-in-page', (_event, url) => handleNavigation(url));

        authWindow.on('closed', () => {
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: 'Pencere kapatıldı' });
          }
        });

        authWindow.loadURL(oauthUrl);
      }).catch((err: unknown) => {
        resolve({ success: false, error: (err as Error).message });
      });
    });
  });

  ipcMain.handle('auth:signOut', async (): Promise<void> => {
    await signOut();
  });

  ipcMain.handle('auth:getSession', async (): Promise<{ userId: string; email: string } | null> => {
    const session = await getSession();
    if (!session) return null;
    return { userId: session.user.id, email: session.user.email ?? '' };
  });

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

  // --- App Info ---
  ipcMain.handle('app:getVersion', () => app.getVersion());

  // --- Update Handler ---
  ipcMain.handle('app:checkForUpdates', async () => {
    return manualCheckForUpdates();
  });

  // --- Group Handlers ---

  ipcMain.handle('group:getAll', async () => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('Groups fetch error:', error); return []; }
    return (data || []).map((g: Record<string, unknown>) => ({
      id: g.id, name: g.name, ownerId: g.owner_id, createdAt: g.created_at,
    }));
  });

  ipcMain.handle('group:create', async (_event, name: string) => {
    const userId = await getCurrentUserId();
    console.log('group:create userId:', userId);
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('groups')
      .insert({ name, owner_id: userId })
      .select()
      .single();
    if (error) {
      console.error('Group insert error:', error);
      throw error;
    }

    // Add owner as member
    const { error: memberError } = await supabase.from('group_members').insert({
      group_id: data.id, user_id: userId, role: 'owner',
    });
    if (memberError) console.error('Group member insert error:', memberError);

    return { id: data.id, name: data.name, ownerId: data.owner_id, createdAt: data.created_at };
  });

  ipcMain.handle('group:delete', async (_event, id: string) => {
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) console.error('Group delete error:', error);
  });

  ipcMain.handle('group:getMembers', async (_event, groupId: string) => {
    const { data, error } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });
    if (error) { console.error('Members fetch error:', error); return []; }

    // Get emails for members
    const members = [];
    for (const m of data || []) {
      const { data: userData } = await supabase.rpc('get_user_id_by_email', { lookup_email: '' });
      // We need a different approach - store email lookup
      members.push({
        id: m.id, groupId: m.group_id, userId: m.user_id,
        role: m.role, joinedAt: m.joined_at,
      });
    }
    return members;
  });

  ipcMain.handle('group:addMember', async (_event, groupId: string, email: string) => {
    // Find user by email
    const { data: userId, error: lookupError } = await supabase
      .rpc('get_user_id_by_email', { lookup_email: email });

    if (lookupError || !userId) {
      return { success: false, error: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı' };
    }

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId, user_id: userId, role: 'member',
    });

    if (error) {
      if (error.code === '23505') return { success: false, error: 'Bu kullanıcı zaten grupta' };
      return { success: false, error: error.message };
    }

    return { success: true };
  });

  ipcMain.handle('group:removeMember', async (_event, groupId: string, userId: string) => {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);
    if (error) console.error('Remove member error:', error);
  });
}
