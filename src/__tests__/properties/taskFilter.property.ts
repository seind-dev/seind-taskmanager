import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { filterByPriority } from '../../shared/taskUtils';
import type { Task, Priority, PriorityFilter } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 4: Öncelik Filtreleme Doğruluğu
 * Validates: Requirements 2.4
 *
 * For any görev listesi ve seçilen öncelik filtresi, filtreleme sonucunda dönen
 * tüm görevlerin öncelik seviyesi seçilen filtreyle eşleşmelidir ve eşleşen
 * hiçbir görev sonuç dışında kalmamalıdır.
 */

// --- Generators ---

const priorityArb: fc.Arbitrary<Priority> = fc.constantFrom('high', 'medium', 'low');
const priorityFilterArb: fc.Arbitrary<PriorityFilter> = fc.constantFrom('all', 'high', 'medium', 'low');

/** Generates a valid Task object with a random priority */
const taskArb: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
  description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  priority: priorityArb,
  status: fc.constantFrom('pending' as const, 'in_progress' as const, 'completed' as const),
  reminder: fc.constant(undefined),
  createdAt: fc.date().map((d) => d.toISOString()),
  updatedAt: fc.date().map((d) => d.toISOString()),
});

/** Generates a list of tasks (0 to 50 items) */
const taskListArb: fc.Arbitrary<Task[]> = fc.array(taskArb, { minLength: 0, maxLength: 50 });

// --- Tests ---

describe('Property 4: Öncelik Filtreleme Doğruluğu', () => {
  it('all returned tasks match the selected priority filter (correctness)', () => {
    fc.assert(
      fc.property(taskListArb, priorityFilterArb, (tasks, filter) => {
        const result = filterByPriority(tasks, filter);

        if (filter === 'all') {
          // 'all' filter must return every task
          expect(result).toHaveLength(tasks.length);
        } else {
          // Every returned task must have the matching priority
          for (const task of result) {
            expect(task.priority).toBe(filter);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('no matching tasks are excluded from the result (completeness)', () => {
    fc.assert(
      fc.property(taskListArb, priorityFilterArb, (tasks, filter) => {
        const result = filterByPriority(tasks, filter);

        if (filter === 'all') {
          // All tasks must be present
          expect(result).toHaveLength(tasks.length);
        } else {
          // Count tasks in original list that match the filter
          const expectedCount = tasks.filter((t) => t.priority === filter).length;
          expect(result).toHaveLength(expectedCount);

          // Every matching task from the original list must appear in the result
          const resultIds = new Set(result.map((t) => t.id));
          for (const task of tasks) {
            if (task.priority === filter) {
              expect(resultIds.has(task.id)).toBe(true);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('filter preserves correctness and completeness together', () => {
    fc.assert(
      fc.property(taskListArb, priorityFilterArb, (tasks, filter) => {
        const result = filterByPriority(tasks, filter);

        // Correctness: every result matches the filter
        if (filter !== 'all') {
          expect(result.every((t) => t.priority === filter)).toBe(true);
        }

        // Completeness: result count equals expected matching count
        const expectedCount =
          filter === 'all' ? tasks.length : tasks.filter((t) => t.priority === filter).length;
        expect(result).toHaveLength(expectedCount);

        // No tasks are fabricated: every result ID exists in the original list
        const originalIds = new Set(tasks.map((t) => t.id));
        for (const task of result) {
          expect(originalIds.has(task.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
