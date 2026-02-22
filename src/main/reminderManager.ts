import cron from 'node-cron';
import type { Task, Reminder, RepeatInterval } from '../shared/types';
import type { DataStore } from './dataStore';

// --- Constants ---

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 604_800_000;

// --- Scheduler Abstraction (for testability) ---

export interface ScheduledJob {
  stop(): void;
}

export interface CronScheduler {
  schedule(cronExpression: string, callback: () => void): ScheduledJob;
}

/** Production scheduler using node-cron */
export class NodeCronScheduler implements CronScheduler {
  schedule(cronExpression: string, callback: () => void): ScheduledJob {
    const task = cron.schedule(cronExpression, callback);
    return { stop: () => task.stop() };
  }
}

// --- Notification Callback Type ---

export type NotificationCallback = (task: Task) => void;

// --- Pure Helper: Calculate Next Trigger ---

/**
 * Calculates the next trigger time for a repeating reminder.
 * - 'daily': adds exactly 86400000ms (1 day)
 * - 'weekly': adds exactly 604800000ms (7 days)
 * - 'once': returns undefined (no next trigger)
 */
export function calculateNextTrigger(
  currentTrigger: string,
  repeat: RepeatInterval,
): string | undefined {
  if (repeat === 'once') {
    return undefined;
  }

  const currentMs = new Date(currentTrigger).getTime();
  const delta = repeat === 'daily' ? MS_PER_DAY : MS_PER_WEEK;

  return new Date(currentMs + delta).toISOString();
}

// --- Helper: Convert a Date to a cron expression ---

/**
 * Converts an ISO 8601 date string to a cron expression for a one-time trigger.
 * Format: "minute hour dayOfMonth month *"
 * node-cron uses 0-indexed months? No — node-cron months are 1-12.
 */
function dateToCron(dateTime: string): string {
  const d = new Date(dateTime);
  const minute = d.getMinutes();
  const hour = d.getHours();
  const dayOfMonth = d.getDate();
  const month = d.getMonth() + 1; // JS months are 0-indexed, cron is 1-indexed
  return `${minute} ${hour} ${dayOfMonth} ${month} *`;
}

// --- ReminderManager ---

export class ReminderManager {
  private activeJobs = new Map<string, ScheduledJob>();
  private dataStore: DataStore;
  private scheduler: CronScheduler;
  private onNotification: NotificationCallback;

  constructor(
    dataStore: DataStore,
    onNotification: NotificationCallback,
    scheduler: CronScheduler = new NodeCronScheduler(),
  ) {
    this.dataStore = dataStore;
    this.onNotification = onNotification;
    this.scheduler = scheduler;
  }

  /**
   * Schedules a cron job for the given task's reminder.
   * If a job already exists for this taskId, it is cancelled first.
   */
  scheduleReminder(taskId: string, reminder: Reminder): void {
    // Cancel any existing job for this task
    this.cancelJob(taskId);

    if (!reminder.enabled) {
      return;
    }

    const triggerTime = new Date(reminder.nextTrigger);
    const now = new Date();

    // Don't schedule if the trigger time is in the past
    if (triggerTime.getTime() <= now.getTime()) {
      return;
    }

    const cronExpr = dateToCron(reminder.nextTrigger);

    const job = this.scheduler.schedule(cronExpr, () => {
      this.handleTrigger(taskId);
    });

    this.activeJobs.set(taskId, job);
  }

  /**
   * Cancels the reminder for a given task.
   * Stops the cron job and marks the reminder as disabled in the DataStore.
   */
  cancelReminder(taskId: string): void {
    this.cancelJob(taskId);

    const task = this.dataStore.getTask(taskId);
    if (task?.reminder) {
      this.dataStore.updateTask(taskId, {
        reminder: { ...task.reminder, enabled: false },
      });
    }
  }

  /**
   * Re-schedules all active reminders from the DataStore.
   * Called at application startup.
   */
  rescheduleAll(): void {
    // Stop all existing jobs
    for (const [, job] of this.activeJobs) {
      job.stop();
    }
    this.activeJobs.clear();

    const tasks = this.dataStore.getTasks();
    for (const task of tasks) {
      if (task.reminder?.enabled) {
        this.scheduleReminder(task.id, task.reminder);
      }
    }
  }

  /** Returns the number of currently active jobs (useful for testing). */
  get activeJobCount(): number {
    return this.activeJobs.size;
  }

  // --- Private Helpers ---

  private cancelJob(taskId: string): void {
    const existing = this.activeJobs.get(taskId);
    if (existing) {
      existing.stop();
      this.activeJobs.delete(taskId);
    }
  }

  private handleTrigger(taskId: string): void {
    const task = this.dataStore.getTask(taskId);
    if (!task || !task.reminder) {
      this.cancelJob(taskId);
      return;
    }

    // Fire the notification
    this.onNotification(task);

    if (task.reminder.repeat === 'once') {
      // One-time reminder: disable it
      this.dataStore.updateTask(taskId, {
        reminder: { ...task.reminder, enabled: false },
      });
      this.cancelJob(taskId);
    } else {
      // Repeating reminder: calculate next trigger and reschedule
      const nextTrigger = calculateNextTrigger(
        task.reminder.nextTrigger,
        task.reminder.repeat,
      );

      if (nextTrigger) {
        const updatedReminder: Reminder = {
          ...task.reminder,
          nextTrigger,
        };

        this.dataStore.updateTask(taskId, { reminder: updatedReminder });
        // Reschedule with the new trigger time
        this.cancelJob(taskId);
        this.scheduleReminder(taskId, updatedReminder);
      }
    }
  }
}
