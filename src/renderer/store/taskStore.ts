import { create } from 'zustand';
import type { Task, CreateTaskDTO, PriorityFilter, Theme } from '../../shared/types';

export type Page = 'list' | 'form' | 'settings' | 'dashboard' | 'calendar' | 'kanban';

interface TaskStore {
  tasks: Task[];
  filter: PriorityFilter;
  theme: Theme;
  currentPage: Page;
  editingTaskId: string | null;

  // Actions
  loadTasks: () => Promise<void>;
  addTask: (data: CreateTaskDTO) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;
  setFilter: (filter: PriorityFilter) => void;
  setTheme: (theme: Theme) => void;
  navigateTo: (page: Page) => void;
  openEditForm: (taskId: string) => void;
  openCreateForm: () => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],
  filter: 'all',
  theme: 'dark',
  currentPage: 'list',
  editingTaskId: null,

  loadTasks: async () => {
    const [tasks, settings] = await Promise.all([
      window.api.getTasks(),
      window.api.getSettings(),
    ]);
    set({ tasks, theme: settings.theme });
  },

  addTask: async (data) => {
    await window.api.addTask(data);
    const tasks = await window.api.getTasks();
    set({ tasks });
  },

  updateTask: async (id, updates) => {
    await window.api.updateTask(id, updates);
    const tasks = await window.api.getTasks();
    set({ tasks });
  },

  deleteTask: async (id) => {
    await window.api.deleteTask(id);
    const tasks = await window.api.getTasks();
    set({ tasks });
  },

  reorderTasks: async (orderedIds) => {
    await window.api.reorderTasks(orderedIds);
    const tasks = await window.api.getTasks();
    set({ tasks });
  },

  setFilter: (filter) => {
    set({ filter });
  },

  setTheme: async (theme) => {
    await window.api.updateSettings({ theme });
    set({ theme });
  },

  navigateTo: (page) => {
    set({ currentPage: page, editingTaskId: null });
  },

  openEditForm: (taskId) => {
    set({ currentPage: 'form', editingTaskId: taskId });
  },

  openCreateForm: () => {
    set({ currentPage: 'form', editingTaskId: null });
  },
}));
