import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/electronAPI';

const api: ElectronAPI = {
  // Task operations
  getTasks: () => ipcRenderer.invoke('task:getAll'),
  getTask: (id) => ipcRenderer.invoke('task:get', id),
  addTask: (data) => ipcRenderer.invoke('task:add', data),
  updateTask: (id, updates) => ipcRenderer.invoke('task:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  reorderTasks: (orderedIds) => ipcRenderer.invoke('task:reorder', orderedIds),

  // Reminder operations
  setReminder: (taskId, reminder) => ipcRenderer.invoke('reminder:set', taskId, reminder),
  cancelReminder: (taskId) => ipcRenderer.invoke('reminder:cancel', taskId),

  // Settings operations
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),

  // App operations
  getAutoLaunch: () => ipcRenderer.invoke('app:getAutoLaunch'),
  setAutoLaunch: (enabled) => ipcRenderer.invoke('app:setAutoLaunch', enabled),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

  // Update
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),

  // Notifications
  onNotification: (callback: (data: { id: string; title: string; body: string; priority: string; type: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; title: string; body: string; priority: string; type: string }) => callback(data);
    ipcRenderer.on('notification:show', handler);
    return () => { ipcRenderer.removeListener('notification:show', handler); };
  },
};

contextBridge.exposeInMainWorld('api', api);
