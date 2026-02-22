import { BrowserWindow, screen } from 'electron';
import { join } from 'path';
import Store from 'electron-store';

interface NotificationData {
  id: string;
  title: string;
  body: string;
  priority: string;
  type: string;
}

const notifStore = new Store({ name: 'notification-history' });

const NOTIFICATION_WIDTH = 360;
const NOTIFICATION_HEIGHT = 100;
const MARGIN = 16;
const DISPLAY_DURATION = 5000;

let activeWindows: BrowserWindow[] = [];

/**
 * Shows a Steam-style overlay notification at the bottom-right of the screen.
 * Creates a frameless, transparent, always-on-top window.
 */
export function showOverlayNotification(data: NotificationData): void {
  // Save to notification history
  const history = (notifStore.get('history') as Array<Record<string, unknown>>) || [];
  history.unshift({
    id: data.id,
    title: data.title,
    body: data.body,
    priority: data.priority,
    type: data.type,
    timestamp: new Date().toISOString(),
    read: false,
  });
  // Keep last 100 notifications
  if (history.length > 100) history.length = 100;
  notifStore.set('history', history);

  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: screenH } = display.workAreaSize;

  // Stack notifications above each other
  const stackOffset = activeWindows.length * (NOTIFICATION_HEIGHT + 8);
  const x = screenW - NOTIFICATION_WIDTH - MARGIN;
  const y = screenH - NOTIFICATION_HEIGHT - MARGIN - stackOffset;

  const win = new BrowserWindow({
    width: NOTIFICATION_WIDTH,
    height: NOTIFICATION_HEIGHT,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Prevent the window from being focused/activated
  win.setAlwaysOnTop(true, 'screen-saver');

  const priorityColors: Record<string, { bg: string; border: string; dot: string }> = {
    high: { bg: '#1a1a2e', border: '#ef4444', dot: '#ef4444' },
    medium: { bg: '#1a1a2e', border: '#f59e0b', dot: '#f59e0b' },
    low: { bg: '#1a1a2e', border: '#10b981', dot: '#10b981' },
  };

  const colors = priorityColors[data.priority] ?? priorityColors.low;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
    -webkit-app-region: no-drag;
  }
  .notification {
    width: ${NOTIFICATION_WIDTH - 8}px;
    margin: 4px;
    background: ${colors.bg};
    border: 1px solid ${colors.border}33;
    border-left: 3px solid ${colors.border};
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    opacity: 0;
    transform: translateX(40px);
    animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards,
               slideOut 0.35s cubic-bezier(0.55, 0, 1, 0.45) ${DISPLAY_DURATION}ms forwards;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
    backdrop-filter: blur(20px);
    cursor: pointer;
  }
  .notification:hover { background: #1e1e36; }
  .dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    background: ${colors.dot};
    margin-top: 4px;
    flex-shrink: 0;
    box-shadow: 0 0 8px ${colors.dot}66;
  }
  .content { flex: 1; min-width: 0; }
  .title {
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 3px;
  }
  .body {
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .close {
    width: 20px; height: 20px;
    border: none; background: transparent;
    color: #64748b; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
    margin-top: 2px;
    font-size: 14px;
    transition: all 0.15s;
  }
  .close:hover { color: #f1f5f9; background: rgba(255,255,255,0.1); }
  .app-label {
    font-size: 9px;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  @keyframes slideIn {
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    to { opacity: 0; transform: translateX(40px); }
  }
</style>
</head>
<body>
  <div class="notification" onclick="window.close()">
    <div class="dot"></div>
    <div class="content">
      <div class="app-label">Görev Yöneticisi</div>
      <div class="title">${escapeHtml(data.title)}</div>
      <div class="body">${escapeHtml(data.body)}</div>
    </div>
    <button class="close" onclick="event.stopPropagation(); window.close()">✕</button>
  </div>
</body>
</html>`;

  win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  win.once('ready-to-show', () => {
    win.showInactive();
  });

  activeWindows.push(win);

  // Auto-close after animation completes
  const timeout = setTimeout(() => {
    if (!win.isDestroyed()) win.close();
  }, DISPLAY_DURATION + 400);

  win.on('closed', () => {
    clearTimeout(timeout);
    activeWindows = activeWindows.filter((w) => w !== win);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
