import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { DataStore, InMemoryStore } from '../../main/dataStore';
import type { CreateTaskDTO } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 2: Boş/Boşluk Başlık Reddi
 * Validates: Requirements 1.3
 *
 * For any yalnızca boşluk karakterlerinden oluşan string (boş string dahil),
 * bu string ile görev oluşturma girişimi reddedilmeli ve mevcut görev listesi
 * değişmemelidir.
 */

// --- Generators ---

/** Generates strings that are empty or contain only whitespace characters (spaces, tabs, newlines) */
const whitespaceOnlyArb: fc.Arbitrary<string> = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 1, maxLength: 50 }),
);

/** Generates a valid non-blank title (at least one non-whitespace character) */
const validTitleArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/** Generates a CreateTaskDTO without priority (priority: undefined) */
const createTaskDtoWithoutPriorityArb: fc.Arbitrary<CreateTaskDTO> = fc.record({
  title: validTitleArb,
  description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  priority: fc.constant(undefined),
});

// --- Tests ---

describe('Property 2: Boş/Boşluk Başlık Reddi', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore(new InMemoryStore());
  });

  it('rejects task creation with empty or whitespace-only titles and leaves task list unchanged', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (blankTitle) => {
        store = new DataStore(new InMemoryStore());

        const tasksBefore = store.getTasks();
        const countBefore = tasksBefore.length;

        // Attempting to create a task with blank title must throw
        expect(() => store.addTask({ title: blankTitle })).toThrow();

        // Task list must remain unchanged
        const tasksAfter = store.getTasks();
        expect(tasksAfter).toHaveLength(countBefore);
        expect(tasksAfter).toEqual(tasksBefore);
      }),
      { numRuns: 100 },
    );
  });

  it('rejects blank titles even when other valid fields are provided', () => {
    fc.assert(
      fc.property(
        whitespaceOnlyArb,
        fc.constantFrom('high' as const, 'medium' as const, 'low' as const),
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        (blankTitle, priority, description) => {
          store = new DataStore(new InMemoryStore());

          const tasksBefore = store.getTasks();

          expect(() =>
            store.addTask({ title: blankTitle, priority, description }),
          ).toThrow();

          // Task list must remain unchanged
          expect(store.getTasks()).toEqual(tasksBefore);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects blank titles when store already contains tasks', () => {
    fc.assert(
      fc.property(
        whitespaceOnlyArb,
        fc.integer({ min: 1, max: 5 }),
        (blankTitle, preExistingCount) => {
          store = new DataStore(new InMemoryStore());

          // Seed the store with some valid tasks
          for (let i = 0; i < preExistingCount; i++) {
            store.addTask({ title: `Valid Task ${i + 1}` });
          }

          const tasksBefore = store.getTasks();
          const countBefore = tasksBefore.length;

          // Attempting to add a blank-titled task must throw
          expect(() => store.addTask({ title: blankTitle })).toThrow();

          // Existing tasks must be preserved exactly
          const tasksAfter = store.getTasks();
          expect(tasksAfter).toHaveLength(countBefore);
          expect(tasksAfter).toEqual(tasksBefore);
        },
      ),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: task-reminder-app, Property 3: Varsayılan Öncelik Ataması
 * Validates: Requirements 2.2
 *
 * For any öncelik seviyesi belirtilmeden oluşturulan görev, kaydedilen görevin
 * öncelik seviyesi 'low' (Düşük) olmalıdır.
 */

describe('Property 3: Varsayılan Öncelik Ataması', () => {
  let store: DataStore;

  beforeEach(() => {
    store = new DataStore(new InMemoryStore());
  });

  it('assigns low priority by default when priority is not specified', () => {
    fc.assert(
      fc.property(createTaskDtoWithoutPriorityArb, (dto) => {
        store = new DataStore(new InMemoryStore());

        // Create task without specifying priority
        const created = store.addTask(dto);

        // The returned task must have priority 'low'
        expect(created.priority).toBe('low');

        // The stored task must also have priority 'low'
        const stored = store.getTask(created.id);
        expect(stored).toBeDefined();
        expect(stored!.priority).toBe('low');
      }),
      { numRuns: 100 },
    );
  });

  it('assigns low priority when priority is explicitly undefined alongside other fields', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
        (title, description) => {
          store = new DataStore(new InMemoryStore());

          const created = store.addTask({ title, description, priority: undefined });

          expect(created.priority).toBe('low');

          const stored = store.getTask(created.id);
          expect(stored).toBeDefined();
          expect(stored!.priority).toBe('low');
        },
      ),
      { numRuns: 100 },
    );
  });
});
