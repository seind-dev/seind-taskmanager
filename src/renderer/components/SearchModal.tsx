import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Task, Priority } from '../../shared/types';
import type { Page } from '../store/taskStore';

const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
const STATUS_EMOJI: Record<string, string> = { pending: '⏳', in_progress: '🔄', completed: '✅' };

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props): React.ReactElement | null {
  const { tasks, openEditForm, openCreateForm, navigateTo } = useTaskStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCommandMode = query.startsWith('>');
  const searchQuery = isCommandMode ? query.slice(1).trim() : query.trim();

  // Quick actions (command mode or empty query)
  const quickActions: QuickAction[] = [
    { id: 'new', label: 'Yeni Görev Oluştur', icon: '➕', action: () => { onClose(); openCreateForm(); } },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', action: () => { onClose(); navigateTo('dashboard'); } },
    { id: 'tasks', label: 'Görevler', icon: '✅', action: () => { onClose(); navigateTo('list'); } },
    { id: 'kanban', label: 'Kanban Panosu', icon: '📋', action: () => { onClose(); navigateTo('kanban'); } },
    { id: 'calendar', label: 'Takvim', icon: '📅', action: () => { onClose(); navigateTo('calendar'); } },
    { id: 'groups', label: 'Gruplar', icon: '👥', action: () => { onClose(); navigateTo('groups'); } },
    { id: 'notif', label: 'Bildirimler', icon: '🔔', action: () => { onClose(); navigateTo('notifications'); } },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️', action: () => { onClose(); navigateTo('settings'); } },
  ];

  const filteredActions = searchQuery
    ? quickActions.filter((a) => a.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : quickActions;

  // Task search results
  const taskResults = !isCommandMode && searchQuery
    ? tasks.filter((t) => {
        const q = searchQuery.toLowerCase();
        return t.title.toLowerCase().includes(q)
          || t.description?.toLowerCase().includes(q)
          || t.tags?.some((tag) => tag.toLowerCase().includes(q));
      }).slice(0, 10)
    : [];

  // Combined items count
  const showActions = isCommandMode || !searchQuery;
  const totalItems = showActions ? filteredActions.length : taskResults.length;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelectTask = useCallback((task: Task) => {
    onClose();
    openEditForm(task.id);
  }, [onClose, openEditForm]);

  const handleSelectAction = useCallback((action: QuickAction) => {
    action.action();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (showActions && filteredActions[selectedIndex]) {
        handleSelectAction(filteredActions[selectedIndex]);
      } else if (!showActions && taskResults[selectedIndex]) {
        handleSelectTask(taskResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [totalItems, showActions, filteredActions, taskResults, selectedIndex, handleSelectAction, handleSelectTask, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Görev ara veya > komut yaz..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-auto py-2">
          {showActions ? (
            <>
              {!isCommandMode && !searchQuery && (
                <p className="px-4 py-1 text-[10px] text-gray-400 uppercase tracking-wider">Hızlı Erişim</p>
              )}
              {filteredActions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Komut bulunamadı</p>
              ) : (
                filteredActions.map((action, i) => (
                  <button
                    key={action.id}
                    onClick={() => handleSelectAction(action)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                  >
                    <span className="text-sm w-6 text-center">{action.icon}</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{action.label}</span>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              {taskResults.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Sonuç bulunamadı</p>
              ) : (
                taskResults.map((task, i) => (
                  <button
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selectedIndex ? 'bg-gray-100 dark:bg-gray-800' : ''
                    }`}
                  >
                    <span className="text-sm">{STATUS_EMOJI[task.status] || '📋'}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-gray-400 truncate">{task.description.slice(0, 60)}</p>}
                    </div>
                    {task.assigneeName && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-500 shrink-0">👤 {task.assigneeName}</span>
                    )}
                    {task.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">{tag}</span>
                    ))}
                  </button>
                ))
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-400">
          <span>↑↓ gezin</span>
          <span>↵ seç</span>
          <span>&gt; komutlar</span>
          <span>esc kapat</span>
        </div>
      </div>
    </div>
  );
}
