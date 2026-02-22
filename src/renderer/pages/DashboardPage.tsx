import React, { useMemo } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Priority, TaskStatus } from '../../shared/types';

const STATUS_LABELS: Record<TaskStatus, string> = { pending: 'Beklemede', in_progress: 'Devam Ediyor', completed: 'Tamamlandı' };
const STATUS_COLORS: Record<TaskStatus, string> = { pending: 'bg-gray-400', in_progress: 'bg-blue-500', completed: 'bg-emerald-500' };
const PRIORITY_LABELS: Record<Priority, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
const PRIORITY_COLORS: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };

export default function DashboardPage(): React.ReactElement {
  const { tasks, navigateTo } = useTaskStore();

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const high = tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length;
    const withReminder = tasks.filter((t) => t.reminder?.enabled).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Tasks due soon (next 3 days)
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dueSoon = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      const d = new Date(t.dueDate);
      return d <= threeDays && d >= now;
    });

    // Overdue
    const overdue = tasks.filter((t) => {
      if (!t.dueDate || t.status === 'completed') return false;
      return new Date(t.dueDate) < now;
    });

    // By status
    const byStatus: Record<TaskStatus, number> = { pending, in_progress: inProgress, completed };

    // By priority
    const byPriority: Record<Priority, number> = {
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    // Tags distribution
    const tagCounts: Record<string, number> = {};
    tasks.forEach((t) => t.tags?.forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));

    // Weekly completion (last 7 days)
    const weekDays: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      const count = tasks.filter((t) => t.status === 'completed' && t.updatedAt.slice(0, 10) === dayStr).length;
      weekDays.push({ label, count });
    }
    const maxWeekly = Math.max(...weekDays.map((d) => d.count), 1);

    return { total, completed, inProgress, pending, high, withReminder, completionRate, dueSoon, overdue, byStatus, byPriority, tagCounts, weekDays, maxWeekly };
  }, [tasks]);

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Görev istatistikleri ve özet</p>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-gray-900 dark:text-white', bg: 'bg-gray-100 dark:bg-white/5' },
            { label: 'Tamamlanan', value: stats.completed, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Devam Eden', value: stats.inProgress, color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-white/5' },
            { label: 'Yüksek Öncelik', value: stats.high, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Completion Rate + Status Distribution */}
        <div className="grid grid-cols-2 gap-3">
          {/* Completion Ring */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Tamamlanma Oranı</h3>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-800" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="3"
                    strokeDasharray={`${stats.completionRate} ${100 - stats.completionRate}`}
                    strokeLinecap="round" className="text-emerald-500 transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">%{stats.completionRate}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {(['completed', 'in_progress', 'pending'] as TaskStatus[]).map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s]}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{STATUS_LABELS[s]}</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{stats.byStatus[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Priority Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Öncelik Dağılımı</h3>
            <div className="space-y-3">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                const pct = stats.total > 0 ? Math.round((stats.byPriority[p] / stats.total) * 100) : 0;
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{PRIORITY_LABELS[p]}</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">{stats.byPriority[p]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className={`h-full rounded-full ${PRIORITY_COLORS[p]} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Haftalık Tamamlama</h3>
          <div className="flex items-end gap-2 h-24">
            {stats.weekDays.map(({ label, count }, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-gray-900 dark:text-white">{count > 0 ? count : ''}</span>
                <div className="w-full rounded-t bg-gray-500/80 transition-all duration-500" style={{ height: `${(count / stats.maxWeekly) * 64}px`, minHeight: count > 0 ? '4px' : '0' }} />
                <span className="text-[9px] text-gray-400 dark:text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue + Due Soon */}
        {(stats.overdue.length > 0 || stats.dueSoon.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {stats.overdue.length > 0 && (
              <div className="bg-red-50 dark:bg-red-500/5 rounded-xl border border-red-200 dark:border-red-500/20 p-4">
                <h3 className="text-[10px] font-semibold text-red-500 uppercase tracking-widest mb-2">Geciken ({stats.overdue.length})</h3>
                <div className="space-y-1.5">
                  {stats.overdue.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.dueSoon.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl border border-amber-200 dark:border-amber-500/20 p-4">
                <h3 className="text-[10px] font-semibold text-amber-500 uppercase tracking-widest mb-2">Yaklaşan ({stats.dueSoon.length})</h3>
                <div className="space-y-1.5">
                  {stats.dueSoon.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{t.title}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{t.dueDate ? new Date(t.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {Object.keys(stats.tagCounts).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Etiketler</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  {tag} <span className="text-[10px] opacity-60">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigateTo('list')} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            📋 Görev Listesi
          </button>
          <button onClick={() => navigateTo('kanban')} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            📊 Kanban Board
          </button>
          <button onClick={() => navigateTo('calendar')} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            📅 Takvim
          </button>
        </div>
      </div>
    </div>
  );
}
