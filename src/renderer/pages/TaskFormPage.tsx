import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTaskStore } from '../store/taskStore';
import type { Priority, RepeatInterval, SubTask, TaskScope, Group, GroupMember, TaskComment, TaskActivity } from '../../shared/types';

const PRIORITY_OPTIONS: { value: Priority; label: string; emoji: string; activeClass: string }[] = [
  { value: 'high', label: 'Yüksek', emoji: '🔴', activeClass: 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-500/20' },
  { value: 'medium', label: 'Orta', emoji: '🟡', activeClass: 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/20' },
  { value: 'low', label: 'Düşük', emoji: '🟢', activeClass: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/20' },
];

const REPEAT_OPTIONS: { value: RepeatInterval; label: string }[] = [
  { value: 'once', label: 'Bir Kez' },
  { value: 'daily', label: 'Günlük' },
  { value: 'weekly', label: 'Haftalık' },
];

const PRESET_TAGS = ['İş', 'Kişisel', 'Okul', 'Sağlık', 'Alışveriş', 'Proje'];

let subtaskIdCounter = 0;
function genSubtaskId(): string {
  return `st-${Date.now()}-${++subtaskIdCounter}`;
}

export default function TaskFormPage(): React.ReactElement {
  const { tasks, editingTaskId, addTask, updateTask, navigateTo } = useTaskStore();
  const editingTask = useMemo(() => (editingTaskId ? tasks.find((t) => t.id === editingTaskId) : undefined), [editingTaskId, tasks]);
  const isEditMode = !!editingTask;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('low');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDateTime, setReminderDateTime] = useState('');
  const [reminderRepeat, setReminderRepeat] = useState<RepeatInterval>('once');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [scope, setScope] = useState<TaskScope>('personal');
  const [groupId, setGroupId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    window.api.getGroups().then(setGroups).catch(() => {});
  }, []);

  // Load group members when group changes
  useEffect(() => {
    if (groupId) {
      window.api.getGroupMembers(groupId).then(setGroupMembers).catch(() => setGroupMembers([]));
    } else {
      setGroupMembers([]);
    }
  }, [groupId]);

  // Load comments and activity for editing task
  useEffect(() => {
    if (editingTask) {
      window.api.getComments(editingTask.id).then(setComments).catch(() => {});
      window.api.getActivity(editingTask.id).then(setActivities).catch(() => {});
    }
  }, [editingTask]);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description ?? '');
      setPriority(editingTask.priority);
      setDueDate(editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : '');
      setTags(editingTask.tags ?? []);
      setSubtasks(editingTask.subtasks ?? []);
      setScope(editingTask.scope ?? 'personal');
      setGroupId(editingTask.groupId ?? '');
      setAssigneeId(editingTask.assigneeId ?? '');
      if (editingTask.reminder) {
        setReminderEnabled(true);
        const dt = new Date(editingTask.reminder.dateTime);
        setReminderDateTime(toDateTimeLocal(dt));
        setReminderRepeat(editingTask.reminder.repeat);
      } else {
        setReminderEnabled(false);
        setReminderDateTime('');
        setReminderRepeat('once');
      }
    }
  }, [editingTask]);

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const addSubtask = () => {
    const t = newSubtask.trim();
    if (!t) return;
    setSubtasks([...subtasks, { id: genSubtaskId(), title: t, completed: false }]);
    setNewSubtask('');
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((s) => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  const removeSubtask = (id: string) => setSubtasks(subtasks.filter((s) => s.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError('');
    setSuccessMessage('');
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { setTitleError('Başlık alanı boş bırakılamaz.'); return; }

    setSaving(true);
    try {
      const reminder = reminderEnabled && reminderDateTime
        ? { dateTime: new Date(reminderDateTime).toISOString(), repeat: reminderRepeat }
        : undefined;

      if (isEditMode && editingTaskId) {
        await updateTask(editingTaskId, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          scope,
          groupId: groupId || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          tags: tags.length > 0 ? tags : undefined,
          subtasks: subtasks.length > 0 ? subtasks : undefined,
          reminder: reminder ? { ...reminder, enabled: true, nextTrigger: new Date(reminderDateTime).toISOString() } : undefined,
        });
        setSuccessMessage('Görev güncellendi.');
      } else {
        await addTask({
          title: trimmedTitle,
          description: description.trim() || undefined,
          priority,
          scope,
          groupId: scope === 'shared' && groupId ? groupId : undefined,
          assigneeId: scope === 'shared' && assigneeId ? assigneeId : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          tags: tags.length > 0 ? tags : undefined,
          subtasks: subtasks.length > 0 ? subtasks : undefined,
          reminder,
        });
        setSuccessMessage('Görev oluşturuldu.');
      }
      setTimeout(() => navigateTo('list'), 500);
    } catch {
      setTitleError('Kaydetme sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateTo('list')} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Geri">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4" /></svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isEditMode ? 'Görevi Düzenle' : 'Yeni Görev'}</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{isEditMode ? 'Görev bilgilerini güncelleyin' : 'Yeni bir görev oluşturun'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-lg mx-auto space-y-5">
          {successMessage && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 animate-fade-in">
              <span>✅</span><p className="text-sm text-emerald-700 dark:text-emerald-400">{successMessage}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Başlık <span className="text-red-500">*</span></label>
            <input id="task-title" type="text" value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(''); }}
              placeholder="Görev başlığını girin..." autoFocus
              className={`w-full px-4 py-3 rounded-xl border text-sm transition-all bg-white dark:bg-gray-900 ${titleError ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-500/30' : 'border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500'}`} />
            {titleError && <p className="mt-2 text-xs text-red-500 flex items-center gap-1" role="alert"><span>⚠️</span> {titleError}</p>}
          </div>

          {/* Description with Markdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="task-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama <span className="text-[10px] text-gray-400">(Markdown)</span></label>
              <button type="button" onClick={() => setShowPreview(!showPreview)}
                className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                {showPreview ? 'Düzenle' : 'Önizle'}
              </button>
            </div>
            {showPreview ? (
              <div className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[80px] prose prose-sm dark:prose-invert max-w-none">
                {description ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{description}</ReactMarkdown> : <p className="text-gray-400 text-sm">Önizlenecek içerik yok</p>}
              </div>
            ) : (
              <textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Markdown destekli açıklama... (**kalın**, *italik*, - liste)" rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all resize-none" />
            )}
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="task-due" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Son Tarih</label>
            <input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all" />
          </div>

          {/* Priority */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Öncelik</legend>
            <div className="grid grid-cols-3 gap-3">
              {PRIORITY_OPTIONS.map(({ value, label, emoji, activeClass }) => (
                <label key={value} className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${priority === value ? activeClass : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'}`}>
                  <input type="radio" name="priority" value={value} checked={priority === value} onChange={() => setPriority(value)} className="sr-only" />
                  <span className="text-lg">{emoji}</span>
                  <span className="text-xs font-medium">{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Scope */}
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Kapsam</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${scope === 'personal' ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-500/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'}`}>
                <input type="radio" name="scope" value="personal" checked={scope === 'personal'} onChange={() => { setScope('personal'); setGroupId(''); }} className="sr-only" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <div>
                  <span className="text-xs font-medium">Kişisel</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Sadece sende</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${scope === 'shared' ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 ring-1 ring-cyan-200 dark:ring-cyan-500/20' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'}`}>
                <input type="radio" name="scope" value="shared" checked={scope === 'shared'} onChange={() => setScope('shared')} className="sr-only" />
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <div>
                  <span className="text-xs font-medium">Grup</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Herkesle paylaş</p>
                </div>
              </label>
            </div>
          </fieldset>

          {/* Group Selector (only when scope is shared) */}
          {scope === 'shared' && groups.length > 0 && (
            <div>
              <label htmlFor="task-group" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grup</label>
              <select id="task-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all">
                <option value="">Grup seçin (opsiyonel)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Assignee Selector (only when scope is shared and group selected) */}
          {scope === 'shared' && groupId && groupMembers.length > 0 && (
            <div>
              <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Atanan Kişi</label>
              <select id="task-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm bg-white dark:bg-gray-900 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all">
                <option value="">Kimseye atanmadı</option>
                {groupMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>{m.discordName || m.userId.slice(0, 8)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiketler</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                <button key={tag} type="button" onClick={() => addTag(tag)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                  + {tag}
                </button>
              ))}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">&times;</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Özel etiket ekle..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all" />
              <button type="button" onClick={() => addTag(tagInput)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Ekle</button>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alt Görevler</label>
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {subtasks.map((st) => (
                  <div key={st.id} className="flex items-center gap-2 group">
                    <button type="button" onClick={() => toggleSubtask(st.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${st.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                      {st.completed && <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </button>
                    <span className={`flex-1 text-sm ${st.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{st.title}</span>
                    <button type="button" onClick={() => removeSubtask(st.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs">&times;</button>
                  </div>
                ))}
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  {subtasks.filter((s) => s.completed).length}/{subtasks.length} tamamlandı
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                placeholder="Alt görev ekle..."
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-xs bg-white dark:bg-gray-900 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all" />
              <button type="button" onClick={addSubtask}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Ekle</button>
            </div>
          </div>

          {/* Reminder */}
          <fieldset className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-base">🔔</span>
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Hatırlatıcı</legend>
              </div>
              <button type="button" onClick={() => setReminderEnabled(!reminderEnabled)} role="switch" aria-checked={reminderEnabled}
                className={`toggle-switch relative w-11 h-6 rounded-full ${reminderEnabled ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-700'}`}>
                <span className={`toggle-knob absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm ${reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className={`overflow-hidden transition-all duration-200 ${reminderEnabled ? 'max-h-60 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="reminder-datetime" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tarih ve Saat</label>
                  <input id="reminder-datetime" type="datetime-local" value={reminderDateTime} onChange={(e) => setReminderDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Tekrar</label>
                  <div className="grid grid-cols-3 gap-2">
                    {REPEAT_OPTIONS.map(({ value, label }) => (
                      <button key={value} type="button" onClick={() => setReminderRepeat(value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${reminderRepeat === value ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm' : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Submit */}
          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-xl bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 text-sm font-semibold hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-black/10 hover:shadow-lg hover:shadow-black/15">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Kaydediliyor...
              </span>
            ) : (isEditMode ? '✓ Güncelle' : '+ Oluştur')}
          </button>

          {/* Comments Section (edit mode) */}
          {isEditMode && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                💬 Yorumlar <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">{comments.length}</span>
              </h3>
              {/* Add comment */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (newComment.trim() && editingTaskId) {
                        setCommentLoading(true);
                        window.api.addComment(editingTaskId, newComment.trim()).then((c) => {
                          setComments((prev) => [...prev, c]);
                          setNewComment('');
                        }).finally(() => setCommentLoading(false));
                      }
                    }
                  }}
                  placeholder="Yorum yaz..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-gray-500/30 focus:border-gray-500 transition-all"
                />
                <button
                  type="button"
                  disabled={commentLoading || !newComment.trim()}
                  onClick={() => {
                    if (newComment.trim() && editingTaskId) {
                      setCommentLoading(true);
                      window.api.addComment(editingTaskId, newComment.trim()).then((c) => {
                        setComments((prev) => [...prev, c]);
                        setNewComment('');
                      }).finally(() => setCommentLoading(false));
                    }
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  {commentLoading ? '...' : 'Gönder'}
                </button>
              </div>
              {/* Comment list */}
              <div className="space-y-2 max-h-60 overflow-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.discordName || 'Kullanıcı'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{c.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Henüz yorum yok</p>}
              </div>
            </div>
          )}

          {/* Activity Section (edit mode) */}
          {isEditMode && activities.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                📋 Aktivite Geçmişi
              </h3>
              <div className="space-y-2 max-h-48 overflow-auto">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
                    <span className="font-medium text-gray-600 dark:text-gray-300">{a.discordName || 'Kullanıcı'}</span>
                    <span>{a.action === 'commented' ? 'yorum yaptı' : a.action === 'status_changed' ? 'durumu değiştirdi' : a.action === 'assigned' ? 'atadı' : a.action}</span>
                    {a.details && <span className="text-gray-400 truncate max-w-[150px]">— {a.details}</span>}
                    <span className="ml-auto text-[10px] text-gray-400 shrink-0">{new Date(a.createdAt).toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
