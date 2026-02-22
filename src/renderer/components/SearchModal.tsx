import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Task, Priority } from '../../shared/types';

const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
const STATUS_EMOJI: Record<string, string> = { pending: '⏳', in_progress: '🔄', completed: '✅' };

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: Props): React.ReactElement | null {
  const { tasks, openEditForm, navigateTo } = useTaskStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim()
    ? tasks.filter((t) => {
        const q = query.toLowerCase();
        return t.title.toLowerCase().includes(q)
          || t.description?.toLowerCase().includes(q)
          || t.tags?.some((tag) => tag.toLowerCase().includes(q));
      }).slice(0, 10)
    : tasks.slice(0, 8);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleSelect = useCallback((task: Task) => {
    onClose();
    openEditForm(task.id);
  }, [onClose, openEditForm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, handleSelect, onClose]);

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
            placeholder="Görev ara..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 font-mono">ESC</kbd>
        </div>
        {/* Results */}
        <div className="max-h-80 overflow-auto py-2">
          {results.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sonuç bulunamadı</p>
          ) : (
            results.map((task, i) => (
              <button
                key={task.id}
                onClick={() => handleSelect(task)}
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
                {task.tags?.slice(0, 2).map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">{tag}</span>
                ))}
              </button>
            ))
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-400">
          <span>↑↓ gezin</span>
          <span>↵ aç</span>
          <span>esc kapat</span>
        </div>
      </div>
    </div>
  );
}
