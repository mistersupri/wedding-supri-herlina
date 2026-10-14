import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { AdminUser } from '../types.js';
import { AUTH_TOKEN_STORAGE_KEY, UNAUTHORIZED_EVENT, authApi, getAccessToken, getRefreshToken } from '../lib/api.js';

interface AuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session on load. authApi.me() refreshes an expired access token by itself.
  const restore = useCallback(async () => {
    if (!getAccessToken() && !getRefreshToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await authApi.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    restore().finally(() => setIsLoading(false));

    const onUnauthorized = () => setUser(null);
    // Another tab signed in or out.
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_STORAGE_KEY) restore();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener('storage', onStorage);
    };
  }, [restore]);

  const login = useCallback(async (username: string, password: string) => {
    const auth = await authApi.login(username, password);
    setUser(auth.user);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
