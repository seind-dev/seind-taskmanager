import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { DataStore, InMemoryStore } from '../../main/dataStore';
import type { Priority, TaskStatus, CreateTaskDTO } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 1: Görev CRUD Gidiş-Dönüş
 * Validates: Requirements 1.2, 1.5, 1.6, 5.2, 5.3
 *
 * For any geçerli görev verisi, bir görev oluşturulup kaydedildikten sonra
 * depodan yüklendiğinde, orijinal veri ile eşdeğer olmalıdır. Aynı şekilde,
 * bir görev güncellendiğinde güncellenen alanlar doğru yansımalı, silindiğinde
 * ise depodan tamamen kaldırılmalıdır.
 */

// --- Generators ---

const priorityArb: fc.Arbitrary<Priority> = fc.constantFrom('high', 'medium', 'low');
const statusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom('pending', 'in_progress', 'completed');

/** Non-empty title after trim (at least one non-whitespace char) */
const titleArb: fc.Arbitrary<string> = fc
  .stringOf(fc.char(), { minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const descriptionArb: fc.Arbitrary<string | undefined> = fc.option(
  fc.string({ minLength: 0, maxLength: 200 }),
  { nil: undefined },
);

const createTaskDTOArb: fc.Arbitrary<CreateTaskDTO> = fc.record({
  title: titleArb,
  description: descriptionArb,
  priority: fc.option(priorityArb, { nil: undefined }),
});

/** Partial update fields that are safe to apply */
const taskUpdatesArb: fc.Arbitrary<{
  title?: string;
  description?: string;
  priority?: Priority;
  status?: TaskStatus;
}> = fc.record(
  {
    title: titleArb,
    description: fc.string({ minLength: 0, maxLength: 200 }),
    priority: priorityArb,
    status: statusArb,
  },
  { requiredKeys: [] },
);

// --- Tests ---

describe('Property 1: Görev CRUD Gidiş-Dönüş (Round-Trip)', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore(new InMemoryStore());
  });

  it('created task can be retrieved with matching fields', () => {
    fc.assert(
      fc.property(createTaskDTOArb, (dto) => {
        store = new DataStore(new InMemoryStore());

        const created = store.addTask(dto);
        const retrieved = store.getTask(created.id);

        // Task must exist in store
        expect(retrieved).toBeDefined();

        // Title should be trimmed version of input
        expect(retrieved!.title).toBe(dto.title.trim());

        // Description should match
        expect(retrieved!.description).toBe(dto.description);

        // Priority defaults to 'low' if not specified
        expect(retrieved!.priority).toBe(dto.priority ?? 'low');

        // Status always starts as 'pending'
        expect(retrieved!.status).toBe('pending');

        // Timestamps must be valid ISO strings
        expect(new Date(retrieved!.createdAt).toISOString()).toBe(retrieved!.createdAt);
        expect(new Date(retrieved!.updatedAt).toISOString()).toBe(retrieved!.updatedAt);

        // ID must be a non-empty string
        expect(retrieved!.id).toBeTruthy();

        // Task should also appear in getTasks list
        const allTasks = store.getTasks();
        expect(allTasks.some((t) => t.id === created.id)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('updated task reflects changed fields while preserving others', () => {
    fc.assert(
      fc.property(createTaskDTOArb, taskUpdatesArb, (dto, updates) => {
        store = new DataStore(new InMemoryStore());

        const created = store.addTask(dto);
        const originalId = created.id;
        const originalCreatedAt = created.createdAt;

        // Only apply update if there's at least one field
        if (Object.keys(updates).length === 0) return;

        const updated = store.updateTask(originalId, updates);
        const retrieved = store.getTask(originalId);

        expect(retrieved).toBeDefined();

        // ID and createdAt must never change
        expect(retrieved!.id).toBe(originalId);
        expect(retrieved!.createdAt).toBe(originalCreatedAt);

        // Updated fields should reflect new values
        if (updates.title !== undefined) {
          expect(retrieved!.title).toBe(updates.title);
        }
        if (updates.description !== undefined) {
          expect(retrieved!.description).toBe(updates.description);
        }
        if (updates.priority !== undefined) {
          expect(retrieved!.priority).toBe(updates.priority);
        }
        if (updates.status !== undefined) {
          expect(retrieved!.status).toBe(updates.status);
        }

        // updatedAt should be >= createdAt
        expect(new Date(retrieved!.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(originalCreatedAt).getTime(),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('deleted task is completely removed from store', () => {
    fc.assert(
      fc.property(createTaskDTOArb, (dto) => {
        store = new DataStore(new InMemoryStore());

        const created = store.addTask(dto);
        const taskId = created.id;

        // Verify it exists before deletion
        expect(store.getTask(taskId)).toBeDefined();

        // Delete
        store.deleteTask(taskId);

        // Must be gone from getTask
        expect(store.getTask(taskId)).toBeUndefined();

        // Must be gone from getTasks list
        expect(store.getTasks().some((t) => t.id === taskId)).toBe(false);

        // Attempting to delete again should throw
        expect(() => store.deleteTask(taskId)).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('full CRUD cycle: create → read → update → read → delete → verify gone', () => {
    fc.assert(
      fc.property(createTaskDTOArb, taskUpdatesArb, (dto, updates) => {
        store = new DataStore(new InMemoryStore());

        // CREATE
        const created = store.addTask(dto);
        expect(created.id).toBeTruthy();

        // READ after create
        const afterCreate = store.getTask(created.id);
        expect(afterCreate).toBeDefined();
        expect(afterCreate!.title).toBe(dto.title.trim());

        // UPDATE (if we have fields to update)
        if (Object.keys(updates).length > 0) {
          store.updateTask(created.id, updates);
          const afterUpdate = store.getTask(created.id);
          expect(afterUpdate).toBeDefined();

          // Verify each updated field
          for (const [key, value] of Object.entries(updates)) {
            expect((afterUpdate as any)[key]).toBe(value);
          }
        }

        // DELETE
        store.deleteTask(created.id);

        // VERIFY GONE
        expect(store.getTask(created.id)).toBeUndefined();
        expect(store.getTasks()).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});
