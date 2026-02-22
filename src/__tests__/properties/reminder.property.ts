import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateNextTrigger } from '../../main/reminderManager';
import type { RepeatInterval } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 7: Tekrarlayan Hatırlatıcı Sonraki Tetikleme Hesaplaması
 * Validates: Requirements 3.6
 *
 * For any tekrarlayan hatırlatıcı (günlük veya haftalık), tetiklendikten sonra
 * hesaplanan nextTrigger değeri, günlük için tam 1 gün (86400000ms), haftalık
 * için tam 7 gün (604800000ms) sonrasına ayarlanmalıdır. Tek seferlik
 * hatırlatıcılar için nextTrigger güncellenmemelidir.
 */

// --- Constants ---

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 604_800_000;

// --- Generators ---

/** Generates a valid ISO 8601 date string from a reasonable date range */
const isoDateArb: fc.Arbitrary<string> = fc
  .date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  })
  .map((d) => d.toISOString());

const repeatIntervalArb: fc.Arbitrary<RepeatInterval> = fc.constantFrom('once', 'daily', 'weekly');

// --- Tests ---

describe('Property 7: Tekrarlayan Hatırlatıcı Sonraki Tetikleme Hesaplaması', () => {
  it('daily repeat: nextTrigger is exactly 86400000ms (1 day) after currentTrigger', () => {
    fc.assert(
      fc.property(isoDateArb, (currentTrigger) => {
        const result = calculateNextTrigger(currentTrigger, 'daily');

        expect(result).toBeDefined();
        const currentMs = new Date(currentTrigger).getTime();
        const resultMs = new Date(result!).getTime();
        expect(resultMs - currentMs).toBe(MS_PER_DAY);
      }),
      { numRuns: 100 },
    );
  });

  it('weekly repeat: nextTrigger is exactly 604800000ms (7 days) after currentTrigger', () => {
    fc.assert(
      fc.property(isoDateArb, (currentTrigger) => {
        const result = calculateNextTrigger(currentTrigger, 'weekly');

        expect(result).toBeDefined();
        const currentMs = new Date(currentTrigger).getTime();
        const resultMs = new Date(result!).getTime();
        expect(resultMs - currentMs).toBe(MS_PER_WEEK);
      }),
      { numRuns: 100 },
    );
  });

  it('once repeat: nextTrigger is undefined (no rescheduling)', () => {
    fc.assert(
      fc.property(isoDateArb, (currentTrigger) => {
        const result = calculateNextTrigger(currentTrigger, 'once');
        expect(result).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it('for any repeat interval, the property holds consistently', () => {
    fc.assert(
      fc.property(isoDateArb, repeatIntervalArb, (currentTrigger, repeat) => {
        const result = calculateNextTrigger(currentTrigger, repeat);
        const currentMs = new Date(currentTrigger).getTime();

        if (repeat === 'once') {
          expect(result).toBeUndefined();
        } else if (repeat === 'daily') {
          expect(result).toBeDefined();
          expect(new Date(result!).getTime() - currentMs).toBe(MS_PER_DAY);
        } else {
          // weekly
          expect(result).toBeDefined();
          expect(new Date(result!).getTime() - currentMs).toBe(MS_PER_WEEK);
        }
      }),
      { numRuns: 100 },
    );
  });
});

import { ReminderManager, type CronScheduler, type ScheduledJob } from '../../main/reminderManager';
import { DataStore, InMemoryStore } from '../../main/dataStore';
import type { Priority, TaskStatus } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 6: Hatırlatıcı İptali
 * Validates: Requirements 3.5
 *
 * For any aktif hatırlatıcısı olan görev, hatırlatıcı iptal edildikten sonra
 * görevin hatırlatıcı alanı devre dışı (enabled: false) olmalı veya
 * kaldırılmış olmalıdır.
 */

// --- Fake Scheduler ---

class FakeScheduler implements CronScheduler {
  schedule(cronExpression: string, callback: () => void): ScheduledJob {
    return { stop: () => {} };
  }
}

// --- Generators ---

const priorityArb: fc.Arbitrary<Priority> = fc.constantFrom('high', 'medium', 'low');
const statusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom('pending', 'in_progress', 'completed');
const repeatArb: fc.Arbitrary<'once' | 'daily' | 'weekly'> = fc.constantFrom('once', 'daily', 'weekly');

/** Generates a future ISO 8601 date string (1 hour to 365 days from now) */
const futureDateArb: fc.Arbitrary<string> = fc
  .integer({ min: 3_600_000, max: 365 * 86_400_000 })
  .map((offset) => new Date(Date.now() + offset).toISOString());

const taskTitleArb: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0);

// --- Tests ---

describe('Property 6: Hatırlatıcı İptali', () => {
  it('after cancelling an active reminder, the task reminder is disabled (enabled: false)', () => {
    fc.assert(
      fc.property(
        taskTitleArb,
        priorityArb,
        statusArb,
        repeatArb,
        futureDateArb,
        (title, priority, status, repeat, futureDate) => {
          // Fresh store and manager for each iteration
          const store = new InMemoryStore();
          const dataStore = new DataStore(store);
          const scheduler = new FakeScheduler();
          const notifications: unknown[] = [];
          const manager = new ReminderManager(dataStore, (t) => notifications.push(t), scheduler);

          // 1. Create a task with an active reminder
          const task = dataStore.addTask({
            title,
            priority,
            reminder: { dateTime: futureDate, repeat },
          });

          // Verify the task was created with an enabled reminder
          const createdTask = dataStore.getTask(task.id);
          expect(createdTask).toBeDefined();
          expect(createdTask!.reminder).toBeDefined();
          expect(createdTask!.reminder!.enabled).toBe(true);

          // 2. Schedule the reminder
          manager.scheduleReminder(task.id, createdTask!.reminder!);

          // 3. Cancel the reminder
          manager.cancelReminder(task.id);

          // 4. Verify: reminder should be disabled (enabled: false) or removed
          const updatedTask = dataStore.getTask(task.id);
          expect(updatedTask).toBeDefined();

          if (updatedTask!.reminder) {
            // If reminder still exists, it must be disabled
            expect(updatedTask!.reminder.enabled).toBe(false);
          }
          // If reminder is undefined/null, that also satisfies the property
        },
      ),
      { numRuns: 100 },
    );
  });
});
