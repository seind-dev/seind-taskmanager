import { describe, it, expect } from 'vitest';
import { filterByPriority, groupByStatusAndPriority } from '../../shared/taskUtils';
import { Task } from '../../shared/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'test-id',
    title: overrides.title ?? 'Test task',
    priority: overrides.priority ?? 'low',
    status: overrides.status ?? 'pending',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('filterByPriority', () => {
  const tasks: Task[] = [
    makeTask({ id: '1', priority: 'high' }),
    makeTask({ id: '2', priority: 'medium' }),
    makeTask({ id: '3', priority: 'low' }),
    makeTask({ id: '4', priority: 'high' }),
  ];

  it('returns all tasks when filter is "all"', () => {
    const result = filterByPriority(tasks, 'all');
    expect(result).toHaveLength(4);
    expect(result).toEqual(tasks);
  });

  it('returns only high priority tasks', () => {
    const result = filterByPriority(tasks, 'high');
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.priority === 'high')).toBe(true);
  });

  it('returns only medium priority tasks', () => {
    const result = filterByPriority(tasks, 'medium');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns only low priority tasks', () => {
    const result = filterByPriority(tasks, 'low');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('returns empty array when no tasks match', () => {
    const highOnly = [makeTask({ priority: 'high' })];
    expect(filterByPriority(highOnly, 'low')).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(filterByPriority([], 'high')).toEqual([]);
    expect(filterByPriority([], 'all')).toEqual([]);
  });
});

describe('groupByStatusAndPriority', () => {
  it('groups tasks by status:priority key', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'pending', priority: 'high' }),
      makeTask({ id: '2', status: 'pending', priority: 'low' }),
      makeTask({ id: '3', status: 'completed', priority: 'high' }),
    ];

    const result = groupByStatusAndPriority(tasks);

    expect(Object.keys(result)).toHaveLength(3);
    expect(result['pending:high']).toHaveLength(1);
    expect(result['pending:low']).toHaveLength(1);
    expect(result['completed:high']).toHaveLength(1);
  });

  it('preserves total task count across groups', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'pending', priority: 'high' }),
      makeTask({ id: '2', status: 'in_progress', priority: 'medium' }),
      makeTask({ id: '3', status: 'completed', priority: 'low' }),
      makeTask({ id: '4', status: 'pending', priority: 'high' }),
    ];

    const result = groupByStatusAndPriority(tasks);
    const totalCount = Object.values(result).reduce((sum, group) => sum + group.length, 0);
    expect(totalCount).toBe(tasks.length);
  });

  it('returns empty object for empty input', () => {
    expect(groupByStatusAndPriority([])).toEqual({});
  });

  it('places multiple tasks with same status and priority in one group', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'pending', priority: 'high' }),
      makeTask({ id: '2', status: 'pending', priority: 'high' }),
      makeTask({ id: '3', status: 'pending', priority: 'high' }),
    ];

    const result = groupByStatusAndPriority(tasks);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result['pending:high']).toHaveLength(3);
  });

  it('ensures each task appears in exactly one group', () => {
    const tasks: Task[] = [
      makeTask({ id: '1', status: 'pending', priority: 'high' }),
      makeTask({ id: '2', status: 'in_progress', priority: 'medium' }),
    ];

    const result = groupByStatusAndPriority(tasks);
    const allGroupedIds = Object.values(result).flat().map((t) => t.id);
    const uniqueIds = new Set(allGroupedIds);
    expect(uniqueIds.size).toBe(tasks.length);
  });
});
