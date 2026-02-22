import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../store/taskStore';
import type { Theme } from '../../shared/types';

export default function SettingsPage(): React.ReactElement {
  const { theme, setTheme } = useTaskStore();
  const [autoLaunch, setAutoLaunchState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState('');

  useEffect(() => {
    window.api.getAutoLaunch().then((enabled) => {
      setAutoLaunchState(enabled);
      setLoading(false);
    });
  }, []);

  const handleAutoLaunchToggle = async () => {
    const newValue = !autoLaunch;
    await window.api.setAutoLaunch(newValue);
    setAutoLaunchState(newValue);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleCheckForUpdates = async () => {
    setUpdateStatus('checking');
    try {
      const result = await window.api.checkForUpdates();
      if (result.status === 'available') {
        setUpdateStatus('available');
        setUpdateVersion(result.version ?? '');
      } else if (result.status === 'up-to-date') {
        setUpdateStatus('up-to-date');
      } else {
        setUpdateStatus('error');
      }
    } catch {
      setUpdateStatus('error');
    }
    setTimeout(() => setUpdateStatus('idle'), 5000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ayarlar</h2>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Uygulama tercihlerini yönetin</p>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="max-w-lg mx-auto space-y-6">

          {/* General Section */}
          <section>
            <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Genel
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {/* Auto Launch */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                    <span className="text-base">🚀</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Otomatik Başlatma</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Windows başlangıcında otomatik aç
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAutoLaunchToggle}
                  disabled={loading}
                  className={`toggle-switch relative w-11 h-6 rounded-full ${
                    autoLaunch ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-300 dark:bg-gray-700'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  role="switch"
                  aria-checked={autoLaunch}
                >
                  <span
                    className={`toggle-knob absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm ${
                      autoLaunch ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section>
            <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Görünüm
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-150 ${
                  theme === 'dark'
                    ? 'border-gray-600 bg-gray-900 shadow-md shadow-black/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {theme === 'dark' && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                {/* Dark theme preview */}
                <div className="w-full h-16 rounded-lg bg-gray-800 border border-gray-700 p-2 flex flex-col gap-1">
                  <div className="w-3/4 h-1.5 rounded bg-gray-600" />
                  <div className="w-1/2 h-1.5 rounded bg-gray-700" />
                  <div className="flex gap-1 mt-auto">
                    <div className="w-4 h-1.5 rounded bg-blue-500" />
                    <div className="w-4 h-1.5 rounded bg-gray-600" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Koyu</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Karanlık tema</p>
                </div>
              </button>

              <button
                onClick={() => handleThemeChange('light')}
                className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all duration-150 ${
                  theme === 'light'
                    ? 'border-gray-600 bg-white shadow-md shadow-black/10'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                {theme === 'light' && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                {/* Light theme preview */}
                <div className="w-full h-16 rounded-lg bg-gray-50 border border-gray-200 p-2 flex flex-col gap-1">
                  <div className="w-3/4 h-1.5 rounded bg-gray-300" />
                  <div className="w-1/2 h-1.5 rounded bg-gray-200" />
                  <div className="flex gap-1 mt-auto">
                    <div className="w-4 h-1.5 rounded bg-blue-500" />
                    <div className="w-4 h-1.5 rounded bg-gray-300" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Açık</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">Aydınlık tema</p>
                </div>
              </button>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h3 className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Hakkında
            </h3>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Görev Yöneticisi</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Sürüm 3.2.0</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed mb-4">
                Kişisel görev yönetimi masaüstü uygulaması. Electron + React + TypeScript ile geliştirilmiştir.
              </p>

              {/* Update Check Button */}
              <button
                onClick={handleCheckForUpdates}
                disabled={updateStatus === 'checking'}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  updateStatus === 'checking'
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                    : updateStatus === 'available'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : updateStatus === 'up-to-date'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                    : updateStatus === 'error'
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                    : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
                }`}
              >
                {updateStatus === 'checking' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Kontrol ediliyor...
                  </>
                ) : updateStatus === 'available' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    v{updateVersion} indiriliyor...
                  </>
                ) : updateStatus === 'up-to-date' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    Güncel sürümdesiniz
                  </>
                ) : updateStatus === 'error' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Kontrol başarısız
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Güncellemeleri Kontrol Et
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
