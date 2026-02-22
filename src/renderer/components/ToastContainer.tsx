import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppNotification } from '../../shared/electronAPI';

interface ToastItem extends AppNotification {
  exiting: boolean;
}

const PRIORITY_STYLE: Record<string, { accent: string; icon: string }> = {
  high: { accent: 'border-l-red-500', icon: '🔴' },
  medium: { accent: 'border-l-amber-500', icon: '🟡' },
  low: { accent: 'border-l-emerald-500', icon: '🟢' },
};

const AUTO_DISMISS_MS = 5000;

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const style = PRIORITY_STYLE[toast.priority] ?? PRIORITY_STYLE.low;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[3px] ${style.accent} rounded-lg shadow-xl shadow-black/10 dark:shadow-black/30 p-3 cursor-pointer transition-all duration-300 ${
        toast.exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
      }`}
      onClick={() => onDismiss(toast.id)}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-sm mt-0.5 shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{toast.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{toast.body}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function ToastContainer(): React.ReactElement | null {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  useEffect(() => {
    const cleanup = window.api.onNotification((data) => {
      setToasts((prev) => [...prev, { ...data, exiting: false }]);
    });
    return cleanup;
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-10 right-3 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>,
    document.body,
  );
}
