import { supabase } from './supabaseClient';
import type { DataStore } from './dataStore';
import type { Task, CreateTaskDTO, SubTask } from '../shared/types';

/**
 * Supabase sync layer.
 * Wraps DataStore operations to sync with Supabase.
 * Local store acts as cache, Supabase is source of truth.
 */

interface SupabaseTaskRow {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  scope: string;
  tags: string[];
  subtasks: SubTask[];
  due_date: string | null;
  reminder: Task['reminder'] | null;
  order: number;
  created_at: string;
  updated_at: string;
}

function rowToTask(row: SupabaseTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority as Task['priority'],
    status: row.status as Task['status'],
    scope: (row.scope ?? 'shared') as Task['scope'],
    tags: row.tags?.length > 0 ? row.tags : undefined,
    subtasks: row.subtasks?.length > 0 ? row.subtasks : undefined,
    dueDate: row.due_date ?? undefined,
    reminder: row.reminder ?? undefined,
    order: row.order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskToRow(task: Partial<Task> & { id?: string }) {
  const row: Record<string, unknown> = {};
  if (task.id !== undefined) row.id = task.id;
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description || null;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.status !== undefined) row.status = task.status;
  if (task.scope !== undefined) row.scope = task.scope;
  if (task.tags !== undefined) row.tags = task.tags || [];
  if (task.subtasks !== undefined) row.subtasks = task.subtasks || [];
  if (task.dueDate !== undefined) row.due_date = task.dueDate || null;
  if (task.reminder !== undefined) row.reminder = task.reminder || null;
  if (task.order !== undefined) row.order = task.order;
  return row;
}

export class SupabaseSync {
  private dataStore: DataStore;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
  }

  /** Pull shared tasks from Supabase and merge with local personal tasks */
  async pullTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('scope', 'shared')
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase pull error:', error);
      return this.dataStore.getTasks();
    }

    const sharedTasks = (data as SupabaseTaskRow[]).map(rowToTask);
    // Get local personal tasks
    const localTasks = this.dataStore.getTasks();
    const personalTasks = localTasks.filter((t) => t.scope === 'personal');
    // Merge: personal (local) + shared (supabase)
    const merged = [...personalTasks, ...sharedTasks];
    this.dataStore.setTasks(merged);
    return merged;
  }

  /** Get all tasks — try Supabase first, fallback to local */
  async getTasks(): Promise<Task[]> {
    try {
      return await this.pullTasks();
    } catch {
      return this.dataStore.getTasks();
    }
  }

  /** Get single task */
  async getTask(id: string): Promise<Task | undefined> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return this.dataStore.getTask(id);
    return rowToTask(data as SupabaseTaskRow);
  }

  /** Add task — push to Supabase only if shared */
  async addTask(dto: CreateTaskDTO): Promise<Task> {
    const localTask = this.dataStore.addTask(dto);

    if (localTask.scope === 'shared') {
      const row = {
        id: localTask.id,
        title: localTask.title,
        description: localTask.description || null,
        priority: localTask.priority,
        status: localTask.status,
        scope: localTask.scope,
        tags: localTask.tags || [],
        subtasks: localTask.subtasks || [],
        due_date: localTask.dueDate || null,
        reminder: localTask.reminder || null,
        order: localTask.order || 0,
        created_at: localTask.createdAt,
        updated_at: localTask.updatedAt,
      };
      const { error } = await supabase.from('tasks').insert(row);
      if (error) console.error('Supabase insert error:', error);
    }

    return localTask;
  }

  /** Update task in Supabase + local — only sync shared tasks */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const updated = this.dataStore.updateTask(id, updates);

    if (updated.scope === 'shared') {
      const row = taskToRow(updates);
      row.updated_at = updated.updatedAt;
      const { error } = await supabase.from('tasks').update(row).eq('id', id);
      if (error) console.error('Supabase update error:', error);
    }

    return updated;
  }

  /** Delete task from Supabase + local — only delete from Supabase if shared */
  async deleteTask(id: string): Promise<void> {
    const task = this.dataStore.getTask(id);
    const isShared = task?.scope === 'shared';

    this.dataStore.deleteTask(id);

    if (isShared) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) console.error('Supabase delete error:', error);
    }
  }

  /** Reorder tasks in Supabase + local — only sync shared task orders */
  async reorderTasks(orderedIds: string[]): Promise<void> {
    this.dataStore.reorderTasks(orderedIds);

    // Only update order for shared tasks in Supabase
    const allTasks = this.dataStore.getTasks();
    const sharedIds = new Set(allTasks.filter((t) => t.scope === 'shared').map((t) => t.id));
    const updates = orderedIds
      .map((id, i) => ({ id, order: i }))
      .filter(({ id }) => sharedIds.has(id))
      .map(({ id, order }) => supabase.from('tasks').update({ order }).eq('id', id));

    if (updates.length > 0) await Promise.allSettled(updates);
  }
}
