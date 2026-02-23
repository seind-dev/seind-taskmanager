import { supabase, getCurrentUserId } from './supabaseClient';
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
  group_id: string | null;
  assignee_id: string | null;
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
    groupId: row.group_id ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
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
  if (task.groupId !== undefined) row.group_id = task.groupId || null;
  if (task.assigneeId !== undefined) row.assignee_id = task.assigneeId || null;
  return row;
}

export class SupabaseSync {
  private dataStore: DataStore;
  private onChange?: () => void;

  constructor(dataStore: DataStore) {
    this.dataStore = dataStore;
  }

  /** Subscribe to Realtime changes on tasks table */
  subscribeRealtime(onChange: () => void): void {
    this.onChange = onChange;
    supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        this.onChange?.();
      })
      .subscribe();
  }

  /** Pull tasks from Supabase — RLS handles visibility */
  async pullTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase pull error:', error);
      return this.dataStore.getTasks();
    }

    const tasks = (data as SupabaseTaskRow[]).map(rowToTask);

    // Resolve assignee names
    const assigneeIds = [...new Set(tasks.filter((t) => t.assigneeId).map((t) => t.assigneeId!))];
    const nameMap = new Map<string, string>();
    for (const uid of assigneeIds) {
      try {
        const { data: info } = await supabase.rpc('get_user_discord_info', { uid });
        if (info && info.length > 0 && info[0].discord_name) {
          nameMap.set(uid, info[0].discord_name);
        }
      } catch { /* ignore */ }
    }
    for (const task of tasks) {
      if (task.assigneeId && nameMap.has(task.assigneeId)) {
        task.assigneeName = nameMap.get(task.assigneeId);
      }
    }

    this.dataStore.setTasks(tasks);
    return tasks;
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

  /** Add task — always push to Supabase with user_id */
  async addTask(dto: CreateTaskDTO): Promise<Task> {
    const localTask = this.dataStore.addTask(dto);
    const userId = await getCurrentUserId();

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
      user_id: userId,
      group_id: localTask.groupId || null,
      assignee_id: localTask.assigneeId || null,
    };
    const { error } = await supabase.from('tasks').insert(row);
    if (error) console.error('Supabase insert error:', error);

    return localTask;
  }

  /** Update task in Supabase + local */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const updated = this.dataStore.updateTask(id, updates);

    const row = taskToRow(updates);
    row.updated_at = updated.updatedAt;
    const { error } = await supabase.from('tasks').update(row).eq('id', id);
    if (error) console.error('Supabase update error:', error);

    return updated;
  }

  /** Delete task from Supabase + local */
  async deleteTask(id: string): Promise<void> {
    this.dataStore.deleteTask(id);

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Supabase delete error:', error);
  }

  /** Reorder tasks in Supabase + local */
  async reorderTasks(orderedIds: string[]): Promise<void> {
    this.dataStore.reorderTasks(orderedIds);

    const updates = orderedIds
      .map((id, i) => ({ id, order: i }))
      .map(({ id, order }) => supabase.from('tasks').update({ order }).eq('id', id));

    if (updates.length > 0) await Promise.allSettled(updates);
  }
}
