import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useTaskStore } from './store/taskStore';
import ToastContainer from './components/ToastContainer';
import type { Page } from './store/taskStore';
import LoginPage from './pages/LoginPage';

const TaskListPage = React.lazy(() => import('./pages/TaskListPage'));
const TaskFormPage = React.lazy(() => import('./pages/TaskFormPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const CalendarPage = React.lazy(() => import('./pages/CalendarPage'));
const KanbanPage = React.lazy(() => import('./pages/KanbanPage'));
const GroupsPage = React.lazy(() => import('./pages/GroupsPage'));

/* ── Titlebar Icons ── */

function IconMinimize() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconMaximize() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <rect x="2" y="2" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/* ── Nav Icons ── */

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

function IconTasks({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconKanban({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="4" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="8" y="3" width="4" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <rect x="13" y="3" width="4" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
    </svg>
  );
}

function IconCalendar({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 3v2M13 3v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M10 7v6M7 10h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconGroups({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5"
        fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5.05 5.05l1.41 1.41M13.54 13.54l1.41 1.41M5.05 14.95l1.41-1.41M13.54 6.46l1.41-1.41"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Loading ── */

function Loading(): React.ReactElement {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 dark:text-gray-500">Yükleniyor...</p>
      </div>
    </div>
  );
}

/* ── Custom Titlebar ── */

function Titlebar(): React.ReactElement {
  return (
    <div className="h-8 flex items-center justify-between bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 no-select"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 pl-3">
        <div className="w-3.5 h-3.5 rounded bg-gray-800 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5L8.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Görev Yöneticisi</span>
      </div>
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={() => window.api.windowMinimize()} className="h-full px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Küçült"><IconMinimize /></button>
        <button onClick={() => window.api.windowMaximize()} className="h-full px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Büyüt"><IconMaximize /></button>
        <button onClick={() => window.api.windowClose()} className="h-full px-3 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-600 hover:text-white transition-colors" aria-label="Kapat"><IconClose /></button>
      </div>
    </div>
  );
}

/* ── Keyboard Shortcut Hint ── */

function ShortcutHint(): React.ReactElement {
  const [show, setShow] = useState(false);
  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="1" y="4" width="14" height="9" rx="2" />
          <path d="M4 7h1M7 7h2M11 7h1M5 10h6" strokeLinecap="round" />
        </svg>
        Kısayollar
      </button>
      {show && (
        <div className="px-3 pb-2 space-y-1 text-[10px] text-gray-400 dark:text-gray-500 animate-fade-in">
          <div className="flex justify-between"><span>Yeni Görev</span><kbd className="kbd">Ctrl+N</kbd></div>
          <div className="flex justify-between"><span>Ara</span><kbd className="kbd">Ctrl+K</kbd></div>
          <div className="flex justify-between"><span>Dashboard</span><kbd className="kbd">Ctrl+D</kbd></div>
          <div className="flex justify-between"><span>Kanban</span><kbd className="kbd">Ctrl+B</kbd></div>
          <div className="flex justify-between"><span>Takvim</span><kbd className="kbd">Ctrl+L</kbd></div>
          <div className="flex justify-between"><span>Ayarlar</span><kbd className="kbd">Ctrl+,</kbd></div>
        </div>
      )}
    </>
  );
}

/* ── Nav Items ── */

const navItems: { page: Page; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: (a) => <IconDashboard active={a} /> },
  { page: 'list', label: 'Görevler', icon: (a) => <IconTasks active={a} /> },
  { page: 'kanban', label: 'Kanban', icon: (a) => <IconKanban active={a} /> },
  { page: 'calendar', label: 'Takvim', icon: (a) => <IconCalendar active={a} /> },
  { page: 'groups', label: 'Gruplar', icon: (a) => <IconGroups active={a} /> },
  { page: 'form', label: 'Yeni Görev', icon: (a) => <IconPlus active={a} /> },
  { page: 'settings', label: 'Ayarlar', icon: (a) => <IconSettings active={a} /> },
];

/* ── App ── */

function App(): React.ReactElement {
  const { theme, currentPage, tasks, loadTasks, navigateTo, openCreateForm } = useTaskStore();
  const [mounted, setMounted] = useState(false);
  const [appVersion, setAppVersion] = useState('');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  // Check session on mount
  useEffect(() => {
    window.api.getSession().then((session) => {
      setAuthenticated(!!session);
    }).catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    loadTasks();
    setMounted(true);
    window.api.getVersion().then(setAppVersion).catch(() => {});
  }, [loadTasks, authenticated]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  /* ── Keyboard Shortcuts ── */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'n': e.preventDefault(); openCreateForm(); break;
        case 'd': e.preventDefault(); navigateTo('dashboard'); break;
        case 'b': e.preventDefault(); navigateTo('kanban'); break;
        case 'l': e.preventDefault(); navigateTo('calendar'); break;
        case ',': e.preventDefault(); navigateTo('settings'); break;
        case 'k': e.preventDefault(); navigateTo('list'); break;
      }
    }
  }, [openCreateForm, navigateTo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleNavClick = (page: Page) => {
    if (page === 'form') openCreateForm();
    else navigateTo(page);
  };

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;

  const renderPage = (): React.ReactElement => {
    switch (currentPage) {
      case 'list': return <TaskListPage />;
      case 'form': return <TaskFormPage />;
      case 'settings': return <SettingsPage />;
      case 'dashboard': return <DashboardPage />;
      case 'calendar': return <CalendarPage />;
      case 'kanban': return <KanbanPage />;
      case 'groups': return <GroupsPage />;
    }
  };

  // Loading state
  if (authenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — show login
  if (!authenticated) {
    return <LoginPage onAuth={() => setAuthenticated(true)} />;
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${mounted ? '' : 'opacity-0'} transition-opacity duration-300`}>
      <Titlebar />
      <ToastContainer />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className={`w-56 flex flex-col no-select ${theme === 'dark' ? 'sidebar-gradient' : 'sidebar-gradient light'} border-r border-gray-200 dark:border-gray-800`}>
          {/* Stats */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bekleyen</p>
              </div>
              <div className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/5">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{inProgressCount}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Devam</p>
              </div>
            </div>
          </div>
          <div className="mx-4 border-t border-gray-200 dark:border-gray-700/50" />
          {/* Navigation */}
          <div className="flex-1 px-3 py-3 flex flex-col gap-0.5">
            {navItems.map(({ page, label, icon }) => {
              const isActive = currentPage === page;
              return (
                <button key={page} onClick={() => handleNavClick(page)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white/10 text-white shadow-md shadow-black/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {icon(isActive)}
                  {label}
                </button>
              );
            })}
          </div>
          {/* Shortcuts + Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700/50">
            <ShortcutHint />
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-600 text-center">v{appVersion || '...'}</p>
            </div>
          </div>
        </nav>
        {/* Main Content */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 overflow-hidden">
          <Suspense fallback={<Loading />}>
            <div key={currentPage} className="h-full animate-fade-in">
              {renderPage()}
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
