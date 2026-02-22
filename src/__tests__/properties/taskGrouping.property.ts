import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { groupByStatusAndPriority } from '../../shared/taskUtils';
import type { Task, Priority, TaskStatus } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 8: Görev Gruplama Doğruluğu
 * Validates: Requirements 7.2
 *
 * For any görev listesi, durum ve öncelik seviyesine göre gruplama uygulandığında,
 * her gruptaki tüm görevler o grubun durum ve öncelik kriterlerine uymalıdır
 * ve hiçbir görev kaybolmamalıdır (toplam görev sayısı korunmalıdır).
 */

// --- Generators ---

const priorityArb: fc.Arbitrary<Priority> = fc.constantFrom('high', 'medium', 'low');
const statusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom('pending', 'in_progress', 'completed');

const taskArb: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  priority: priorityArb,
  status: statusArb,
  reminder: fc.constant(undefined),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
});

const taskListArb: fc.Arbitrary<Task[]> = fc.array(taskArb, { minLength: 0, maxLength: 50 });

// --- Tests ---

describe('Property 8: Görev Gruplama Doğruluğu', () => {
  it('every task in each group matches that group\'s status and priority criteria', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatusAndPriority(tasks);

        for (const [key, groupTasks] of Object.entries(groups)) {
          const [expectedStatus, expectedPriority] = key.split(':');

          for (const task of groupTasks) {
            expect(task.status).toBe(expectedStatus);
            expect(task.priority).toBe(expectedPriority);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no tasks are lost — total count across all groups equals input count', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatusAndPriority(tasks);

        const totalInGroups = Object.values(groups).reduce(
          (sum, groupTasks) => sum + groupTasks.length,
          0,
        );

        expect(totalInGroups).toBe(tasks.length);
      }),
      { numRuns: 100 },
    );
  });

  it('no tasks are duplicated across groups', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatusAndPriority(tasks);

        const allGroupedIds: string[] = [];
        for (const groupTasks of Object.values(groups)) {
          for (const task of groupTasks) {
            allGroupedIds.push(task.id);
          }
        }

        const uniqueIds = new Set(allGroupedIds);
        expect(uniqueIds.size).toBe(allGroupedIds.length);
      }),
      { numRuns: 100 },
    );
  });

  it('grouping preserves correctness, completeness, and uniqueness together', () => {
    fc.assert(
      fc.property(taskListArb, (tasks) => {
        const groups = groupByStatusAndPriority(tasks);

        // Correctness: every task matches its group key
        for (const [key, groupTasks] of Object.entries(groups)) {
          const [expectedStatus, expectedPriority] = key.split(':');
          expect(groupTasks.every(
            (t) => t.status === expectedStatus && t.priority === expectedPriority,
          )).toBe(true);
        }

        // Completeness: total count preserved
        const totalInGroups = Object.values(groups).reduce(
          (sum, g) => sum + g.length,
          0,
        );
        expect(totalInGroups).toBe(tasks.length);

        // No fabricated tasks: every grouped ID exists in the original list
        const originalIds = new Set(tasks.map((t) => t.id));
        for (const groupTasks of Object.values(groups)) {
          for (const task of groupTasks) {
            expect(originalIds.has(task.id)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
