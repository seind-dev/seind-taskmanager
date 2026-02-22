import React, { useCallback, useRef, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Task, TaskStatus, Priority } from '../../shared/types';

const COLUMNS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  { status: 'pending', label: 'Beklemede', color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800/50' },
  { status: 'in_progress', label: 'Devam Ediyor', color: 'text-gray-600 dark:text-gray-300', bg: 'bg-gray-50 dark:bg-gray-800/30' },
  { status: 'completed', label: 'Tamamlandı', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/5' },
];

const PRIORITY_DOT: Record<Priority, string> = { high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
const PRIORITY_LABELS: Record<Priority, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };

export default function KanbanPage(): React.ReactElement {
  const { tasks, updateTask, openEditForm } = useTaskStore();
  const dragTaskRef = useRef<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const handleDragStart = useCallback((_e: React.DragEvent, task: Task) => {
    dragTaskRef.current = task;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverCol(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const task = dragTaskRef.current;
    if (!task || task.status === targetStatus) return;
    updateTask(task.id, { status: targetStatus });
    dragTaskRef.current = null;
  }, [updateTask]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kanban Board</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Görevleri sürükleyerek durumlarını değiştirin</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full min-h-0">
          {COLUMNS.map(({ status, label, color, bg }) => {
            const colTasks = tasks.filter((t) => t.status === status);
            const isDragOver = dragOverCol === status;
            return (
              <div key={status}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
                className={`flex-1 flex flex-col rounded-xl ${bg} border-2 transition-colors ${isDragOver ? 'border-gray-500 dark:border-gray-400' : 'border-transparent'}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${color}`}>{label}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium">{colTasks.length}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-auto px-3 pb-3 space-y-2">
                  {colTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} onDragStart={handleDragStart} onEdit={openEditForm} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-xs text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                      Görev yok
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ task, onDragStart, onEdit }: {
  task: Task; onDragStart: (e: React.DragEvent, task: Task) => void; onEdit: (id: string) => void;
}): React.ReactElement {
  const subtaskCount = task.subtasks?.length ?? 0;
  const subtaskDone = task.subtasks?.filter((s) => s.completed).length ?? 0;
  const isCompleted = task.status === 'completed';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onEdit(task.id)}
      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-3 cursor-grab active:cursor-grabbing hover:shadow-md dark:hover:shadow-black/20 transition-all group"
    >
      {/* Tags + Scope */}
      {((task.tags && task.tags.length > 0) || task.scope === 'shared') && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.scope === 'shared' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-medium">Grup</span>
          )}
          {task.tags?.map((tag) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{tag}</span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className={`text-sm font-medium mb-1 ${isCompleted ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>{task.title}</p>

      {/* Description preview */}
      {task.description && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Bottom row */}
      <div className="flex items-center gap-2 mt-2">
        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{PRIORITY_LABELS[task.priority]}</span>

        {subtaskCount > 0 && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
            ☑ {subtaskDone}/{subtaskCount}
          </span>
        )}

        {task.dueDate && (
          <span className={`text-[10px] ml-auto ${new Date(task.dueDate) < new Date() && !isCompleted ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
            📅 {new Date(task.dueDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </span>
        )}

        {task.reminder?.enabled && <span className="text-[10px]">🔔</span>}
      </div>
    </div>
  );
}
