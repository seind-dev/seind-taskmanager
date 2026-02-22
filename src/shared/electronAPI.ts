import type { Task, CreateTaskDTO, Reminder, AppSettings, AuthResult, Group, GroupMember } from './types';

export interface ElectronAPI {
  // Auth operations
  signInWithDiscord(): Promise<AuthResult>;
  signOut(): Promise<void>;
  getSession(): Promise<{ userId: string; email: string } | null>;

  // Task operations
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  addTask(data: CreateTaskDTO): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  reorderTasks(orderedIds: string[]): Promise<void>;

  // Reminder operations
  setReminder(taskId: string, reminder: Reminder): Promise<void>;
  cancelReminder(taskId: string): Promise<void>;

  // Settings operations
  getSettings(): Promise<AppSettings>;
  updateSettings(settings: Partial<AppSettings>): Promise<AppSettings>;

  // App operations
  getAutoLaunch(): Promise<boolean>;
  setAutoLaunch(enabled: boolean): Promise<void>;

  // App info
  getVersion(): Promise<string>;

  // Window controls
  windowMinimize(): void;
  windowMaximize(): void;
  windowClose(): void;

  // Update
  checkForUpdates(): Promise<{ status: string; version?: string }>;

  // Groups
  getGroups(): Promise<Group[]>;
  createGroup(name: string): Promise<Group>;
  deleteGroup(id: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<GroupMember[]>;
  addGroupMember(groupId: string, email: string): Promise<{ success: boolean; error?: string }>;
  removeGroupMember(groupId: string, userId: string): Promise<void>;

  // Notifications
  onNotification(callback: (data: AppNotification) => void): () => void;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  priority: string;
  type: string;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
