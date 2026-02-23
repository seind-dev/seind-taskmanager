import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/electronAPI';

const api: ElectronAPI = {
  // Auth operations
  signInWithDiscord: () => ipcRenderer.invoke('auth:signInWithDiscord'),
  signOut: () => ipcRenderer.invoke('auth:signOut'),
  getSession: () => ipcRenderer.invoke('auth:getSession'),

  // Task operations
  getTasks: () => ipcRenderer.invoke('task:getAll'),
  getTask: (id) => ipcRenderer.invoke('task:get', id),
  addTask: (data) => ipcRenderer.invoke('task:add', data),
  updateTask: (id, updates) => ipcRenderer.invoke('task:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  reorderTasks: (orderedIds) => ipcRenderer.invoke('task:reorder', orderedIds),

  // Comment operations
  getComments: (taskId) => ipcRenderer.invoke('comment:getAll', taskId),
  addComment: (taskId, content) => ipcRenderer.invoke('comment:add', taskId, content),
  deleteComment: (commentId) => ipcRenderer.invoke('comment:delete', commentId),

  // Activity operations
  getActivity: (taskId) => ipcRenderer.invoke('activity:getAll', taskId),

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

  // Groups
  getGroups: () => ipcRenderer.invoke('group:getAll'),
  createGroup: (name) => ipcRenderer.invoke('group:create', name),
  deleteGroup: (id) => ipcRenderer.invoke('group:delete', id),
  getGroupMembers: (groupId) => ipcRenderer.invoke('group:getMembers', groupId),
  addGroupMember: (groupId, email) => ipcRenderer.invoke('group:addMember', groupId, email),
  removeGroupMember: (groupId, userId) => ipcRenderer.invoke('group:removeMember', groupId, userId),

  // Notification history
  getNotificationHistory: () => ipcRenderer.invoke('notification:getHistory'),
  markNotificationRead: (id) => ipcRenderer.invoke('notification:markRead', id),
  clearNotificationHistory: () => ipcRenderer.invoke('notification:clearHistory'),

  // Notifications
  onNotification: (callback: (data: { id: string; title: string; body: string; priority: string; type: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { id: string; title: string; body: string; priority: string; type: string }) => callback(data);
    ipcRenderer.on('notification:show', handler);
    return () => { ipcRenderer.removeListener('notification:show', handler); };
  },

  // Realtime task updates
  onTasksUpdated: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('tasks:updated', handler);
    return () => { ipcRenderer.removeListener('tasks:updated', handler); };
  },
};

contextBridge.exposeInMainWorld('api', api);
