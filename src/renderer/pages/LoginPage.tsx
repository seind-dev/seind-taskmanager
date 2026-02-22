import React, { useState } from 'react';

interface LoginPageProps {
  onAuth: () => void;
}

export default function LoginPage({ onAuth }: LoginPageProps): React.ReactElement {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await window.api.signUp(email, password);
        if (!result.success) {
          setError(result.error || 'Kayıt başarısız');
        } else {
          setSignUpSuccess(true);
        }
      } else {
        const result = await window.api.signIn(email, password);
        if (!result.success) {
          setError(result.error || 'Giriş başarısız');
        } else {
          onAuth();
        }
      }
    } catch {
      setError('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="w-full max-w-sm mx-auto p-8">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-100 mb-2">Kayıt Başarılı</h2>
            <p className="text-sm text-gray-400 mb-6">E-posta adresini doğruladıktan sonra giriş yapabilirsin.</p>
            <button
              onClick={() => { setIsSignUp(false); setSignUpSuccess(false); }}
              className="w-full py-2.5 rounded-xl bg-gray-800 text-gray-200 text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      {/* Draggable titlebar area */}
      <div className="fixed top-0 left-0 right-0 h-8" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      {/* Window controls */}
      <div className="fixed top-2 right-2 flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={() => window.api.windowMinimize()} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        </button>
        <button onClick={() => window.api.windowClose()} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 5" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-100">Görev Yöneticisi</h1>
          <p className="text-sm text-gray-500 mt-1">{isSignUp ? 'Hesap oluştur' : 'Giriş yap'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
              aria-label="E-posta adresi"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Şifre"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-colors"
              aria-label="Şifre"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Bekle...' : isSignUp ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          {isSignUp ? 'Zaten hesabın var mı?' : 'Hesabın yok mu?'}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            {isSignUp ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </p>
      </div>
    </div>
  );
}
