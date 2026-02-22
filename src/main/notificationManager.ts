import type { BrowserWindow } from 'electron';
import type { Task, Priority } from '../shared/types';
import { showOverlayNotification } from './overlayNotification';

// --- Priority Display Labels ---

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Yüksek Öncelik',
  medium: 'Orta Öncelik',
  low: 'Düşük Öncelik',
};

// --- Pure Function: Build Notification Payload ---

/**
 * Builds a notification payload from a Task.
 * This is a pure function — easily testable.
 */
export function buildNotificationPayload(task: Task): { title: string; body: string } {
  return {
    title: task.title,
    body: PRIORITY_LABELS[task.priority],
  };
}

// --- Notification Window Reference (kept for IPC compatibility) ---

let _mainWindow: BrowserWindow | null = null;

export function setNotificationWindow(win: BrowserWindow): void {
  _mainWindow = win;
}

/**
 * Shows a Steam-style overlay notification outside the app.
 */
export function showNotification(task: Task): void {
  const payload = buildNotificationPayload(task);
  showOverlayNotification({
    id: `reminder-${task.id}-${Date.now()}`,
    title: payload.title,
    body: payload.body,
    priority: task.priority,
    type: 'reminder',
  });
}

/**
 * Sends startup high-priority alert as overlay notification.
 */
export function showStartupHighPriorityAlert(tasks: Task[]): void {
  const highPriority = tasks.filter(
    (t) => t.priority === 'high' && t.status !== 'completed',
  );

  if (highPriority.length === 0) return;

  showOverlayNotification({
    id: `startup-${Date.now()}`,
    title: `${highPriority.length} Yüksek Öncelikli Görev`,
    body: highPriority.map((t) => t.title).join(', '),
    priority: 'high',
    type: 'alert',
  });
}
