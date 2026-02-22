import { randomUUID } from 'crypto';
import type { Task, AppSettings, CreateTaskDTO } from '../shared/types';

// --- Store Backend Interface (for testability) ---

export interface StoreBackend {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}

/** Simple in-memory store for testing */
export class InMemoryStore implements StoreBackend {
  private data = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }
}

// --- Constants ---

export const DEFAULT_SETTINGS: AppSettings = {
  autoLaunch: false,
  theme: 'dark',
  startMinimized: false,
};

// --- DataStore ---

export class DataStore {
  private store: StoreBackend;

  constructor(store: StoreBackend) {
    this.store = store;
  }

  // --- Task Methods ---

  getTasks(): Task[] {
    return this.store.get<Task[]>('tasks') ?? [];
  }

  setTasks(tasks: Task[]): void {
    this.store.set('tasks', tasks);
  }

  getTask(id: string): Task | undefined {
    return this.getTasks().find((t) => t.id === id);
  }

  addTask(dto: CreateTaskDTO): Task {
    const trimmed = dto.title.trim();
    if (!trimmed) {
      throw new Error('Task title cannot be empty');
    }

    const now = new Date().toISOString();
    const task: Task = {
      id: randomUUID(),
      title: trimmed,
      description: dto.description,
      priority: dto.priority ?? 'low',
      status: 'pending',
      scope: dto.scope ?? 'personal',
      groupId: dto.groupId,
      assigneeId: dto.assigneeId,
      createdAt: now,
      updatedAt: now,
    };

    if (dto.reminder) {
      task.reminder = {
        ...dto.reminder,
        enabled: true,
        nextTrigger: dto.reminder.dateTime,
      };
    }

    const tasks = this.getTasks();
    tasks.push(task);
    this.store.set('tasks', tasks);

    return task;
  }

  updateTask(id: string, updates: Partial<Task>): Task {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) {
      throw new Error(`Task not found: ${id}`);
    }

    // Prevent overwriting id and createdAt
    const { id: _id, createdAt: _ca, ...safeUpdates } = updates;

    const updated: Task = {
      ...tasks[index],
      ...safeUpdates,
      updatedAt: new Date().toISOString(),
    };

    tasks[index] = updated;
    this.store.set('tasks', tasks);

    return updated;
  }

  deleteTask(id: string): void {
    const tasks = this.getTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) {
      throw new Error(`Task not found: ${id}`);
    }
    this.store.set('tasks', filtered);
  }

  reorderTasks(orderedIds: string[]): void {
    const tasks = this.getTasks();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const reordered: Task[] = [];
    for (let i = 0; i < orderedIds.length; i++) {
      const task = taskMap.get(orderedIds[i]);
      if (task) {
        task.order = i;
        reordered.push(task);
        taskMap.delete(orderedIds[i]);
      }
    }
    // Append any tasks not in the ordered list
    for (const task of taskMap.values()) {
      reordered.push(task);
    }
    this.store.set('tasks', reordered);
  }

  // --- Settings Methods ---

  getSettings(): AppSettings {
    return this.store.get<AppSettings>('settings') ?? { ...DEFAULT_SETTINGS };
  }

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated: AppSettings = { ...current, ...partial };
    this.store.set('settings', updated);
    return updated;
  }
}
