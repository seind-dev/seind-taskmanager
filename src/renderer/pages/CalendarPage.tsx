import React, { useMemo, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Task, Priority } from '../../shared/types';

const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };

function getMonthDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday = 0 in our system
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const days: { date: Date; isCurrentMonth: boolean }[] = [];
  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  // Next month padding
  const remaining = 42 - days.length; // 6 rows
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }
  return days;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarPage(): React.ReactElement {
  const { tasks, openEditForm } = useTaskStore();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const days = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // Map tasks by date (createdAt, dueDate)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      // Show on due date if available, otherwise created date
      const d = t.dueDate ? t.dueDate.slice(0, 10) : t.createdAt.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] ?? []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };

  const todayKey = dateKey(today);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Takvim</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Görevlerinizi takvimde görüntüleyin</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 12L6 8l4-4" /></svg>
            </button>
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Bugün</button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[120px] text-center">{MONTHS_TR[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_TR.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
            {days.map(({ date, isCurrentMonth }, i) => {
              const key = dateKey(date);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const dayTasks = tasksByDate[key] ?? [];
              return (
                <button key={i} onClick={() => setSelectedDate(isSelected ? null : key)}
                  className={`relative h-16 p-1 text-left transition-colors ${
                    isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-950'
                  } ${isSelected ? 'ring-2 ring-gray-500 ring-inset' : ''} hover:bg-gray-50 dark:hover:bg-gray-800`}
                >
                  <span className={`text-[11px] font-medium ${
                    isToday ? 'w-5 h-5 rounded-full bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 flex items-center justify-center' :
                    isCurrentMonth ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'
                  }`}>{date.getDate()}</span>
                  {/* Task dots */}
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                      {dayTasks.slice(0, 3).map((t) => (
                        <span key={t.id} className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      ))}
                      {dayTasks.length > 3 && <span className="text-[8px] text-gray-400">+{dayTasks.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Panel */}
        {selectedDate && (
          <div className="w-64 border-l border-gray-200 dark:border-gray-800 overflow-auto p-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">{selectedTasks.length} görev</p>
            {selectedTasks.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Bu tarihte görev yok</p>
            ) : (
              <div className="space-y-2">
                {selectedTasks.map((t) => (
                  <button key={t.id} onClick={() => openEditForm(t.id)}
                    className="w-full text-left p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      <span className={`text-xs font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{t.title}</span>
                    </div>
                    {t.tags && t.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {t.tags.map((tag) => (
                          <span key={tag} className="text-[8px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">{tag}</span>
                        ))}
                      </div>
                    )}
                    {t.subtasks && t.subtasks.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1">☑ {t.subtasks.filter((s) => s.completed).length}/{t.subtasks.length}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
