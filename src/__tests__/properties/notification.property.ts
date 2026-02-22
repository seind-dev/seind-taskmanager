import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildNotificationPayload } from '../../main/notificationManager';
import type { Task, Priority, TaskStatus, RepeatInterval, Reminder } from '../../shared/types';

/**
 * Feature: task-reminder-app, Property 5: Bildirim İçeriği Doğruluğu
 * Validates: Requirements 3.3
 *
 * For any hatırlatıcısı olan görev, oluşturulan bildirim payload'u
 * görevin başlığını ve öncelik seviyesini içermelidir.
 */

// --- Priority label mapping (mirrors notificationManager) ---

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Yüksek Öncelik',
  medium: 'Orta Öncelik',
  low: 'Düşük Öncelik',
};

// --- Generators ---

const priorityArb: fc.Arbitrary<Priority> = fc.constantFrom('high', 'medium', 'low');
const statusArb: fc.Arbitrary<TaskStatus> = fc.constantFrom('pending', 'in_progress', 'completed');
const repeatArb: fc.Arbitrary<RepeatInterval> = fc.constantFrom('once', 'daily', 'weekly');

/** Non-empty title after trim */
const titleArb: fc.Arbitrary<string> = fc
  .stringOf(fc.char(), { minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

const reminderArb: fc.Arbitrary<Reminder> = fc.record({
  dateTime: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString()),
  repeat: repeatArb,
  enabled: fc.constant(true),
  nextTrigger: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString()),
});

/** Task with a reminder (required for this property) */
const taskWithReminderArb: fc.Arbitrary<Task> = fc.record({
  id: fc.uuid(),
  title: titleArb,
  description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  priority: priorityArb,
  status: statusArb,
  reminder: reminderArb,
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map((d) => d.toISOString()),
});

// --- Tests ---

describe('Property 5: Bildirim İçeriği Doğruluğu', () => {
  it('notification payload title equals the task title', () => {
    fc.assert(
      fc.property(taskWithReminderArb, (task) => {
        const payload = buildNotificationPayload(task);
        expect(payload.title).toBe(task.title);
      }),
      { numRuns: 100 },
    );
  });

  it('notification payload body contains the priority level label', () => {
    fc.assert(
      fc.property(taskWithReminderArb, (task) => {
        const payload = buildNotificationPayload(task);
        const expectedLabel = PRIORITY_LABELS[task.priority];
        expect(payload.body).toContain(expectedLabel);
      }),
      { numRuns: 100 },
    );
  });
});
