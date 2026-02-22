import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataStore, InMemoryStore } from '../../main/dataStore';
import {
  ReminderManager,
  calculateNextTrigger,
  type CronScheduler,
  type ScheduledJob,
  type NotificationCallback,
} from '../../main/reminderManager';
import type { Reminder } from '../../shared/types';

// --- Fake Scheduler for testing ---

class FakeScheduler implements CronScheduler {
  public jobs: Array<{ cronExpr: string; callback: () => void; stopped: boolean }> = [];

  schedule(cronExpression: string, callback: () => void): ScheduledJob {
    const job = { cronExpr: cronExpression, callback, stopped: false };
    this.jobs.push(job);
    return { stop: () => { job.stopped = true; } };
  }

  /** Simulate firing the most recently scheduled job */
  fireLatest(): void {
    const active = this.jobs.filter((j) => !j.stopped);
    if (active.length > 0) {
      active[active.length - 1].callback();
    }
  }

  /** Simulate firing the job for a specific index */
  fire(index: number): void {
    this.jobs[index]?.callback();
  }
}

// --- Helper: future date string ---

function futureDate(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3600_000).toISOString();
}

// --- Tests ---

describe('calculateNextTrigger', () => {
  const baseTime = '2025-06-15T09:00:00.000Z';

  it('returns +1 day for daily repeat', () => {
    const next = calculateNextTrigger(baseTime, 'daily');
    expect(next).toBeDefined();
    const diff = new Date(next!).getTime() - new Date(baseTime).getTime();
    expect(diff).toBe(86_400_000);
  });

  it('returns +7 days for weekly repeat', () => {
    const next = calculateNextTrigger(baseTime, 'weekly');
    expect(next).toBeDefined();
    const diff = new Date(next!).getTime() - new Date(baseTime).getTime();
    expect(diff).toBe(604_800_000);
  });

  it('returns undefined for once repeat', () => {
    expect(calculateNextTrigger(baseTime, 'once')).toBeUndefined();
  });

  it('produces valid ISO 8601 strings', () => {
    const next = calculateNextTrigger(baseTime, 'daily')!;
    expect(new Date(next).toISOString()).toBe(next);
  });
});

describe('ReminderManager', () => {
  let dataStore: DataStore;
  let scheduler: FakeScheduler;
  let notifications: string[];
  let onNotification: NotificationCallback;
  let manager: ReminderManager;

  beforeEach(() => {
    dataStore = new DataStore(new InMemoryStore());
    scheduler = new FakeScheduler();
    notifications = [];
    onNotification = (task) => { notifications.push(task.id); };
    manager = new ReminderManager(dataStore, onNotification, scheduler);
  });

  describe('scheduleReminder', () => {
    it('creates a cron job for an enabled future reminder', () => {
      const reminder: Reminder = {
        dateTime: futureDate(2),
        repeat: 'once',
        enabled: true,
        nextTrigger: futureDate(2),
      };

      manager.scheduleReminder('task-1', reminder);
      expect(manager.activeJobCount).toBe(1);
      expect(scheduler.jobs).toHaveLength(1);
      expect(scheduler.jobs[0].stopped).toBe(false);
    });

    it('does not schedule a disabled reminder', () => {
      const reminder: Reminder = {
        dateTime: futureDate(2),
        repeat: 'once',
        enabled: false,
        nextTrigger: futureDate(2),
      };

      manager.scheduleReminder('task-1', reminder);
      expect(manager.activeJobCount).toBe(0);
    });

    it('does not schedule a past reminder', () => {
      const reminder: Reminder = {
        dateTime: '2020-01-01T00:00:00Z',
        repeat: 'once',
        enabled: true,
        nextTrigger: '2020-01-01T00:00:00Z',
      };

      manager.scheduleReminder('task-1', reminder);
      expect(manager.activeJobCount).toBe(0);
    });

    it('replaces existing job for the same taskId', () => {
      const r1: Reminder = {
        dateTime: futureDate(2),
        repeat: 'once',
        enabled: true,
        nextTrigger: futureDate(2),
      };
      const r2: Reminder = {
        dateTime: futureDate(5),
        repeat: 'daily',
        enabled: true,
        nextTrigger: futureDate(5),
      };

      manager.scheduleReminder('task-1', r1);
      manager.scheduleReminder('task-1', r2);

      expect(manager.activeJobCount).toBe(1);
      expect(scheduler.jobs[0].stopped).toBe(true); // first job stopped
      expect(scheduler.jobs[1].stopped).toBe(false); // second job active
    });
  });

  describe('cancelReminder', () => {
    it('stops the cron job and marks reminder as disabled', () => {
      const task = dataStore.addTask({
        title: 'Test',
        reminder: { dateTime: futureDate(2), repeat: 'daily' },
      });

      manager.scheduleReminder(task.id, task.reminder!);
      expect(manager.activeJobCount).toBe(1);

      manager.cancelReminder(task.id);
      expect(manager.activeJobCount).toBe(0);

      const updated = dataStore.getTask(task.id)!;
      expect(updated.reminder!.enabled).toBe(false);
    });

    it('handles cancelling a non-existent job gracefully', () => {
      expect(() => manager.cancelReminder('no-such-task')).not.toThrow();
    });
  });

  describe('rescheduleAll', () => {
    it('schedules jobs for all tasks with active reminders', () => {
      const t1 = dataStore.addTask({
        title: 'Task 1',
        reminder: { dateTime: futureDate(2), repeat: 'daily' },
      });
      const t2 = dataStore.addTask({
        title: 'Task 2',
        reminder: { dateTime: futureDate(3), repeat: 'weekly' },
      });
      // Task without reminder
      dataStore.addTask({ title: 'Task 3' });

      manager.rescheduleAll();
      expect(manager.activeJobCount).toBe(2);
    });

    it('clears existing jobs before rescheduling', () => {
      const t1 = dataStore.addTask({
        title: 'Task 1',
        reminder: { dateTime: futureDate(2), repeat: 'daily' },
      });

      manager.scheduleReminder(t1.id, t1.reminder!);
      expect(manager.activeJobCount).toBe(1);

      manager.rescheduleAll();
      // Should still be 1, not 2
      expect(manager.activeJobCount).toBe(1);
      // The original job should be stopped
      expect(scheduler.jobs[0].stopped).toBe(true);
    });

    it('skips tasks with disabled reminders', () => {
      const task = dataStore.addTask({
        title: 'Disabled',
        reminder: { dateTime: futureDate(2), repeat: 'once' },
      });
      // Disable the reminder
      dataStore.updateTask(task.id, {
        reminder: { ...task.reminder!, enabled: false },
      });

      manager.rescheduleAll();
      expect(manager.activeJobCount).toBe(0);
    });
  });

  describe('trigger handling', () => {
    it('fires notification when a reminder triggers', () => {
      const task = dataStore.addTask({
        title: 'Notify me',
        reminder: { dateTime: futureDate(1), repeat: 'once' },
      });

      manager.scheduleReminder(task.id, task.reminder!);
      scheduler.fireLatest();

      expect(notifications).toContain(task.id);
    });

    it('disables one-time reminder after trigger', () => {
      const task = dataStore.addTask({
        title: 'Once only',
        reminder: { dateTime: futureDate(1), repeat: 'once' },
      });

      manager.scheduleReminder(task.id, task.reminder!);
      scheduler.fireLatest();

      const updated = dataStore.getTask(task.id)!;
      expect(updated.reminder!.enabled).toBe(false);
      expect(manager.activeJobCount).toBe(0);
    });

    it('updates nextTrigger for daily repeating reminder', () => {
      const task = dataStore.addTask({
        title: 'Daily',
        reminder: { dateTime: futureDate(1), repeat: 'daily' },
      });
      const originalTrigger = task.reminder!.nextTrigger;

      manager.scheduleReminder(task.id, task.reminder!);
      scheduler.fireLatest();

      const updated = dataStore.getTask(task.id)!;
      const diff =
        new Date(updated.reminder!.nextTrigger).getTime() -
        new Date(originalTrigger).getTime();
      expect(diff).toBe(86_400_000);
      expect(updated.reminder!.enabled).toBe(true);
    });

    it('updates nextTrigger for weekly repeating reminder', () => {
      const task = dataStore.addTask({
        title: 'Weekly',
        reminder: { dateTime: futureDate(1), repeat: 'weekly' },
      });
      const originalTrigger = task.reminder!.nextTrigger;

      manager.scheduleReminder(task.id, task.reminder!);
      scheduler.fireLatest();

      const updated = dataStore.getTask(task.id)!;
      const diff =
        new Date(updated.reminder!.nextTrigger).getTime() -
        new Date(originalTrigger).getTime();
      expect(diff).toBe(604_800_000);
    });

    it('handles trigger for deleted task gracefully', () => {
      const task = dataStore.addTask({
        title: 'Will be deleted',
        reminder: { dateTime: futureDate(1), repeat: 'once' },
      });

      manager.scheduleReminder(task.id, task.reminder!);
      dataStore.deleteTask(task.id);

      expect(() => scheduler.fireLatest()).not.toThrow();
      expect(notifications).toHaveLength(0);
    });
  });
});
