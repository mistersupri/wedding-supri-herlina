import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AdminUser } from '../types.js';
import {
  fetchCurrentAdmin,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  clearAuthTokens,
  logoutAdminApi,
  refreshAuthToken,
} from '../lib/api.js';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: AdminUser, refreshToken?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getAccessToken());
  const [refreshToken, setRefreshToken] = useState<string | null>(() => getRefreshToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      await logoutAdminApi();
    } catch {
      // Ignore network errors on logout
    } finally {
      clearAuthTokens();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = getAccessToken();
    if (currentToken) {
      try {
        const admin = await fetchCurrentAdmin();
        setUser(admin);
      } catch (err) {
        console.warn('Failed to refresh user profile:', err);
        // Attempt refresh token fallback
        const newAccess = await refreshAuthToken();
        if (newAccess) {
          try {
            const admin = await fetchCurrentAdmin();
            setUser(admin);
            setToken(newAccess);
            return;
          } catch {
            await logout();
          }
        } else {
          await logout();
        }
      }
    }
  }, [logout]);

  // Initial authentication check on app load
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const storedToken = getAccessToken();
      const storedRefreshToken = getRefreshToken();

      if (storedToken || storedRefreshToken) {
        try {
          const admin = await fetchCurrentAdmin();
          if (isMounted) {
            setUser(admin);
            setToken(getAccessToken());
            setRefreshToken(getRefreshToken());
          }
        } catch (err) {
          console.warn('Initial session validation error, trying refresh token...', err);
          if (storedRefreshToken) {
            const refreshed = await refreshAuthToken();
            if (refreshed && isMounted) {
              try {
                const admin = await fetchCurrentAdmin();
                if (isMounted) {
                  setUser(admin);
                  setToken(refreshed);
                  setRefreshToken(getRefreshToken());
                }
              } catch {
                if (isMounted) await logout();
              }
            } else if (isMounted) {
              await logout();
            }
          } else if (isMounted) {
            await logout();
          }
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    initAuth();

    // Listen for custom 401 unhandled unauthorized events
    const handleUnauthorizedEvent = () => {
      clearAuthTokens();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    };

    // Listen for cross-tab login/logout events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wedding_admin_token') {
        if (!e.newValue) {
          setToken(null);
          setRefreshToken(null);
          setUser(null);
        } else {
          setToken(e.newValue);
          refreshUser();
        }
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorizedEvent);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorizedEvent);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [logout, refreshUser]);

  const login = (accessToken: string, newUser: AdminUser, newRefreshToken?: string) => {
    setAuthTokens(accessToken, newRefreshToken);
    setToken(accessToken);
    if (newRefreshToken) {
      setRefreshToken(newRefreshToken);
    }
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
