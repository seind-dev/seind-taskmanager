import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTaskStore } from '../store/taskStore';
import { filterByPriority } from '../../shared/taskUtils';
import type { Task, Priority, PriorityFilter, TaskStatus, TaskScope } from '../../shared/types';

/* ── Constants ── */

const PRIORITY_LABELS: Record<Priority, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
const STATUS_LABELS: Record<TaskStatus, string> = { pending: 'Beklemede', in_progress: 'Devam Ediyor', completed: 'Tamamlandı' };
const STATUS_HEADER_STYLE: Record<TaskStatus, { icon: string; color: string }> = {
  pending: { icon: '⏳', color: 'text-gray-500 dark:text-gray-400' },
  in_progress: { icon: '🔄', color: 'text-blue-600 dark:text-blue-400' },
  completed: { icon: '✅', color: 'text-emerald-600 dark:text-emerald-400' },
};
const STATUS_ORDER: TaskStatus[] = ['in_progress', 'pending', 'completed'];
const NEXT_STATUS: Record<TaskStatus, TaskStatus> = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
const FILTER_OPTIONS: { value: PriorityFilter; label: string; dot?: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'high', label: 'Yüksek', dot: 'bg-red-500' },
  { value: 'medium', label: 'Orta', dot: 'bg-amber-500' },
  { value: 'low', label: 'Düşük', dot: 'bg-emerald-500' },
];

type FlatRow = { type: 'header'; status: TaskStatus; count: number } | { type: 'task'; task: Task };
interface ContextMenuState { x: number; y: number; task: Task; }

/* ── SVG Icons ── */
function IconEdit() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M10.586 1.586a2 2 0 0 1 2.828 2.828l-8.5 8.5L1.5 13.5l.586-3.414 8.5-8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M9 3.5l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>; }
function IconArrowRight() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 7.5h10M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function IconTrash() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2.5 4h10M5.5 4V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V4M4 4l.5 8.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

/* ── Context Menu ── */
function ContextMenu({ menu, onClose, onEdit, onDelete, onChangeStatus }: {
  menu: ContextMenuState; onClose: () => void; onEdit: (task: Task) => void; onDelete: (task: Task) => void; onChangeStatus: (task: Task) => void;
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let x = menu.x, y = menu.y;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
    if (x < 0) x = 4; if (y < 0) y = 4;
    setPos({ x, y });
  }, [menu.x, menu.y]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const nextStatus = NEXT_STATUS[menu.task.status];
  return (
    <div ref={ref} className="fixed z-50 w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border border-gray-200/80 dark:border-gray-700/80 rounded-lg shadow-lg shadow-black/8 dark:shadow-black/25 py-1 animate-fade-in" style={{ top: pos.y, left: pos.x }}>
      <button className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors" onClick={() => { onEdit(menu.task); onClose(); }}>
        <span className="w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400"><IconEdit /></span>Düzenle
      </button>
      <button className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100/80 dark:hover:bg-gray-700/60 transition-colors" onClick={() => { onChangeStatus(menu.task); onClose(); }}>
        <span className="w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400"><IconArrowRight /></span>{STATUS_LABELS[nextStatus]}
      </button>
      <div className="mx-2 my-1 border-t border-gray-200/60 dark:border-gray-700/60" />
      <button className="w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2.5 text-red-500 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition-colors" onClick={() => { onDelete(menu.task); onClose(); }}>
        <span className="w-5 h-5 flex items-center justify-center"><IconTrash /></span>Sil
      </button>
    </div>
  );
}

/* ── Delete Dialog ── */
function DeleteConfirmDialog({ task, onConfirm, onCancel }: { task: Task; onConfirm: () => void; onCancel: () => void; }): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500 dark:text-red-400"><IconTrash /></div>
        <h3 className="text-lg font-semibold text-center mb-2">Görevi Sil</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">&quot;{task.title}&quot; görevini silmek istediğinize emin misiniz?</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">İptal</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors">Sil</button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Row with Drag ── */
function TaskRow({ task, onContextMenu, onStatusClick, onDragStart, onDragOver, onDrop }: {
  task: Task; onContextMenu: (e: React.MouseEvent, task: Task) => void; onStatusClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent, task: Task) => void;
}): React.ReactElement {
  const isCompleted = task.status === 'completed';
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length ?? 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, task)}
      onContextMenu={(e) => onContextMenu(e, task)}
      className="group flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg hover:bg-white dark:hover:bg-gray-900/60 transition-colors cursor-grab active:cursor-grabbing"
    >
      {/* Drag handle */}
      <span className="opacity-0 group-hover:opacity-40 text-gray-400 dark:text-gray-600 shrink-0 cursor-grab">
        <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="6" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="6" cy="12" r="1.2"/></svg>
      </span>

      {/* Status */}
      <button onClick={() => onStatusClick(task)}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isCompleted ? 'bg-emerald-500 border-emerald-500 text-white'
          : task.status === 'in_progress' ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`} aria-label={`Durum: ${STATUS_LABELS[task.status]}`}>
        {isCompleted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
      </button>

      {/* Priority dot */}
      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]} ${task.priority === 'high' && !isCompleted ? 'priority-pulse' : ''}`} />

      {/* Title + description + subtask progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</span>
          {subtaskCount > 0 && (
            <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{subtaskDone}/{subtaskCount}</span>
          )}
        </div>
        {task.description && (
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden group-hover:block truncate">
            {task.description.length > 60 ? task.description.slice(0, 60) + '…' : task.description}
          </span>
        )}
      </div>

      {/* Tags + meta */}
      <div className="flex items-center gap-2 shrink-0">
        {task.scope === 'shared' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">Grup</span>
        )}
        {task.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{tag}</span>
        ))}
        {task.reminder?.enabled && <span className="text-xs text-gray-500 dark:text-gray-400">🔔</span>}
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
          task.priority === 'high' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
          : task.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
        }`}>{PRIORITY_LABELS[task.priority]}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-600 w-12 text-right">
          {new Date(task.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  );
}

/* ── Empty State ── */
function EmptyState({ hasAnyTasks }: { hasAnyTasks: boolean }): React.ReactElement {
  const { openCreateForm } = useTaskStore();
  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <span className="text-3xl">{hasAnyTasks ? '🔍' : '📋'}</span>
      </div>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{hasAnyTasks ? 'Sonuç bulunamadı' : 'Henüz görev yok'}</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs mb-5">{hasAnyTasks ? 'Filtreyi değiştirmeyi deneyin.' : 'İlk görevinizi oluşturarak başlayın.'}</p>
      {!hasAnyTasks && (
        <button onClick={() => openCreateForm()} className="px-4 py-2 rounded-lg bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors">+ İlk Görevi Oluştur</button>
      )}
    </div>
  );
}

/* ── Main Component ── */
export default function TaskListPage(): React.ReactElement {
  const { tasks, filter, setFilter, updateTask, deleteTask, reorderTasks } = useTaskStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<'all' | TaskScope>('all');
  const parentRef = useRef<HTMLDivElement>(null);
  const dragTaskRef = useRef<Task | null>(null);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = filterByPriority(tasks, filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (tagFilter) {
      result = result.filter((t) => t.tags?.includes(tagFilter));
    }
    if (scopeFilter !== 'all') {
      result = result.filter((t) => t.scope === scopeFilter);
    }
    return result;
  }, [tasks, filter, searchQuery, tagFilter, scopeFilter]);

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];
    for (const status of STATUS_ORDER) {
      const statusTasks = filteredTasks.filter((t) => t.status === status);
      if (statusTasks.length === 0) continue;
      rows.push({ type: 'header', status, count: statusTasks.length });
      for (const task of statusTasks) rows.push({ type: 'task', task });
    }
    return rows;
  }, [filteredTasks]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (flatRows[index].type === 'header' ? 36 : 44),
    overscan: 10,
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, task: Task) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, task }); }, []);
  const { openEditForm } = useTaskStore();
  const handleEdit = useCallback((task: Task) => { openEditForm(task.id); }, [openEditForm]);
  const handleChangeStatus = useCallback((task: Task) => { updateTask(task.id, { status: NEXT_STATUS[task.status] }); }, [updateTask]);
  const handleDeleteRequest = useCallback((task: Task) => { setDeleteTarget(task); }, []);
  const handleDeleteConfirm = useCallback(() => { if (deleteTarget) { deleteTask(deleteTarget.id); setDeleteTarget(null); } }, [deleteTarget, deleteTask]);

  // Drag & Drop
  const handleDragStart = useCallback((_e: React.DragEvent, task: Task) => { dragTaskRef.current = task; }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    const dragTask = dragTaskRef.current;
    if (!dragTask || dragTask.id === targetTask.id) return;
    // Reorder within same status group
    const statusTasks = tasks.filter((t) => t.status === targetTask.status);
    const otherTasks = tasks.filter((t) => t.status !== targetTask.status);
    const dragIdx = statusTasks.findIndex((t) => t.id === dragTask.id);
    const targetIdx = statusTasks.findIndex((t) => t.id === targetTask.id);
    if (dragIdx === -1) {
      // Moving to different status - update status too
      updateTask(dragTask.id, { status: targetTask.status });
      return;
    }
    const reordered = [...statusTasks];
    reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, dragTask);
    const allOrdered = [...otherTasks, ...reordered];
    reorderTasks(allOrdered.map((t) => t.id));
    dragTaskRef.current = null;
  }, [tasks, reorderTasks, updateTask]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Görevler</h2>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{filteredTasks.length} görev</p>
          </div>
        </div>
        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Görev ara... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all" />
        </div>
        {/* Priority Filters */}
        <div className="flex gap-1.5 mb-2">
          {FILTER_OPTIONS.map(({ value, label, dot }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium transition-all ${filter === value ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
              {dot && <span className={`w-1.5 h-1.5 rounded-full ${filter === value ? 'bg-white dark:bg-gray-900' : dot}`} />}{label}
            </button>
          ))}
          <span className="w-px bg-gray-200 dark:bg-gray-800 mx-1" />
          {([
            { value: 'all' as const, label: 'Tümü' },
            { value: 'personal' as const, label: 'Kişisel' },
            { value: 'shared' as const, label: 'Grup' },
          ]).map(({ value, label }) => (
            <button key={value} onClick={() => setScopeFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full font-medium transition-all ${scopeFilter === value ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setTagFilter(null)}
              className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition-all ${!tagFilter ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>Tüm Etiketler</button>
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2.5 py-1 text-[10px] rounded-full font-medium transition-all ${tagFilter === tag ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{tag}</button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div ref={parentRef} className="flex-1 overflow-auto">
        {flatRows.length === 0 ? <EmptyState hasAnyTasks={tasks.length > 0} /> : (
          <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = flatRows[virtualRow.index];
              return (
                <div key={virtualRow.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}>
                  {row.type === 'header' ? (
                    <div className="flex items-center gap-2 px-6 pt-3 pb-1">
                      <span className={`text-xs ${STATUS_HEADER_STYLE[row.status].color}`}>{STATUS_HEADER_STYLE[row.status].icon}</span>
                      <h3 className={`text-[11px] font-semibold uppercase tracking-wider ${STATUS_HEADER_STYLE[row.status].color}`}>{STATUS_LABELS[row.status]}</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-medium">{row.count}</span>
                    </div>
                  ) : (
                    <TaskRow task={row.task} onContextMenu={handleContextMenu} onStatusClick={handleChangeStatus}
                      onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && createPortal(<ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onEdit={handleEdit} onDelete={handleDeleteRequest} onChangeStatus={handleChangeStatus} />, document.body)}
      {deleteTarget && createPortal(<DeleteConfirmDialog task={deleteTarget} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />, document.body)}
    </div>
  );
}
