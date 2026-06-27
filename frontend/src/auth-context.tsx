import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiFetch, setToken, getToken, API } from './api';

type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  group_id?: string | null;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  demoMode: boolean;
  login: () => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

async function processSessionId(sessionId: string) {
  const res = await fetch(
    'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
    { headers: { 'X-Session-ID': sessionId } }
  );
  if (!res.ok) throw new Error('Auth failed');
  const data = await res.json();
  // exchange with backend
  const exchange = await fetch(`${API}/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: data.session_token }),
  });
  if (!exchange.ok) throw new Error('Backend session failed');
  const ex = await exchange.json();
  await setToken(ex.session_token);
  return ex.user as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(
    (process.env.EXPO_PUBLIC_DEMO_MODE || '').toLowerCase() === 'true'
  );

  // Backend is the source of truth for demo mode (also respects EXPO_PUBLIC_DEMO_MODE)
  useEffect(() => {
    fetch(`${API}/config`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (c && typeof c.demo_mode === 'boolean') setDemoMode(Boolean(c.demo_mode));
      })
      .catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    try {
      const u = await apiFetch('/auth/me');
      setUser(u);
    } catch {
      setUser(null);
      await setToken(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Web: capture session_id from URL hash/query first
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          const match = (hash + search).match(/session_id=([^&]+)/);
          if (match) {
            try {
              const u = await processSessionId(decodeURIComponent(match[1]));
              setUser(u);
              window.history.replaceState(null, '', window.location.pathname);
              setLoading(false);
              return;
            } catch (e) {
              console.warn('session_id processing failed', e);
            }
          }
        } else {
          // Mobile cold start: check initial URL
          const initial = await Linking.getInitialURL();
          if (initial) {
            const m = initial.match(/session_id=([^&]+)/);
            if (m) {
              try {
                const u = await processSessionId(decodeURIComponent(m[1]));
                setUser(u);
                setLoading(false);
                return;
              } catch (e) {
                console.warn('cold start session failed', e);
              }
            }
          }
        }
        const token = await getToken();
        if (token) await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(async () => {
    const redirectUrl =
      Platform.OS === 'web'
        ? `${window.location.origin}/`
        : Linking.createURL('auth');
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(
      redirectUrl
    )}`;
    if (Platform.OS === 'web') {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === 'success' && result.url) {
      const m = result.url.match(/session_id=([^&]+)/);
      if (m) {
        const u = await processSessionId(decodeURIComponent(m[1]));
        setUser(u);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {}
    await setToken(null);
    setUser(null);
  }, []);

  const loginDemo = useCallback(async () => {
    const res = await fetch(`${API}/auth/demo-login`, { method: 'POST' });
    if (!res.ok) throw new Error('Demo mode désactivé côté serveur');
    const data = await res.json();
    await setToken(data.session_token);
    setUser(data.user);
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, demoMode, login, loginDemo, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
