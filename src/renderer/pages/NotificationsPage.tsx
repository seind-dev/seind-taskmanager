import React, { useEffect, useState } from 'react';
import type { NotificationHistoryItem } from '../../shared/types';

const PRIORITY_DOT: Record<string, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
const TYPE_EMOJI: Record<string, string> = { reminder: '🔔', alert: '⚠️' };

export default function NotificationsPage(): React.ReactElement {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await window.api.getNotificationHistory();
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id: string) => {
    await window.api.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const handleClear = async () => {
    await window.api.clearNotificationHistory();
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bildirimler</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} okunmamış` : 'Tüm bildirimler okundu'}
            </p>
          </div>
          {notifications.length > 0 && (
            <button onClick={handleClear}
              className="px-3 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 transition-colors">
              Tümünü Temizle
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <span className="text-3xl">🔕</span>
            </div>
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">Bildirim yok</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">Henüz hiç bildirim almadınız</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => !notif.read && handleMarkRead(notif.id)}
                className={`flex items-start gap-3 px-6 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50 ${
                  !notif.read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''
                }`}
              >
                <span className="text-lg mt-0.5">{TYPE_EMOJI[notif.type] || '📋'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[notif.priority] || 'bg-gray-400'}`} />
                    <p className={`text-sm font-medium truncate ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{notif.body}</p>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-600 shrink-0 mt-1">{formatTime(notif.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
