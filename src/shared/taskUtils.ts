import { Task, Priority, PriorityFilter, TaskStatus } from './types';

/**
 * Görevleri öncelik seviyesine göre filtreler.
 * 'all' filtresi tüm görevleri döndürür, diğer değerler yalnızca eşleşen önceliği döndürür.
 */
export function filterByPriority(tasks: Task[], filter: PriorityFilter): Task[] {
  if (filter === 'all') {
    return tasks;
  }
  return tasks.filter((task) => task.priority === filter);
}

/**
 * Görevleri durum ve öncelik kombinasyonuna göre gruplar.
 * Anahtar formatı: `${status}:${priority}` (ör. 'pending:high', 'completed:low')
 * Her görev tam olarak bir grupta yer alır.
 */
export function groupByStatusAndPriority(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};

  for (const task of tasks) {
    const key = `${task.status}:${task.priority}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(task);
  }

  return groups;
}
