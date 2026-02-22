import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Store from 'electron-store';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Persistent storage for auth session using electron-store
const authStore = new Store({ name: 'supabase-auth' });

const customStorage = {
  getItem: (key: string): string | null => {
    return (authStore.get(key) as string) ?? null;
  },
  setItem: (key: string, value: string): void => {
    authStore.set(key, value);
  },
  removeItem: (key: string): void => {
    authStore.delete(key);
  },
};

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});

/* ── Auth helpers ── */

export async function getDiscordOAuthUrl(): Promise<string> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  return data.url;
}

export async function setSessionFromTokens(accessToken: string, refreshToken: string) {
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id ?? null;
}
