import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { queryClient } from '@/lib/query-client';
import {
  clearStoredSession,
  loadStoredSession,
  logoutUser,
  saveSession,
  validateSession,
} from '@/services/auth';
import { AppUser } from '@/types/auth';

type AuthContextValue = {
  user: AppUser | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (user: AppUser, sessionToken: string, expiresAt: string) => Promise<void>;
  updateUser: (user: AppUser) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const session = await loadStoredSession();
        if (!session) {
          return;
        }

        const validated = await validateSession(session.sessionToken);
        if (!mounted) return;

        if (validated.data) {
          await saveSession(
            validated.data.user,
            validated.data.sessionToken,
            validated.data.expiresAt,
          );
          setUser(validated.data.user);
          setSessionToken(validated.data.sessionToken);
          return;
        }

        const message = (validated.error?.message ?? '').toLowerCase();
        // Network blips: keep local session; invalid/revoked: force re-login.
        if (
          message.includes('invalid_session') ||
          message.includes('unauthorized') ||
          message.includes('database_access_denied')
        ) {
          await clearStoredSession();
          return;
        }

        setUser(session.user);
        setSessionToken(session.sessionToken);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (nextUser: AppUser, token: string, expiresAt: string) => {
    await saveSession(nextUser, token, expiresAt);
    setUser(nextUser);
    setSessionToken(token);
  }, []);

  const updateUser = useCallback(
    async (nextUser: AppUser) => {
      if (!sessionToken) {
        setUser(nextUser);
        return;
      }
      const session = await loadStoredSession();
      const expiresAt = session?.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await saveSession(nextUser, sessionToken, expiresAt);
      setUser(nextUser);
    },
    [sessionToken],
  );

  const signOut = useCallback(async () => {
    const token = sessionToken;
    await logoutUser(token);
    await clearStoredSession();
    queryClient.clear();
    setUser(null);
    setSessionToken(null);
  }, [sessionToken]);

  const value = useMemo(
    () => ({
      user,
      sessionToken,
      isLoading,
      isAuthenticated: Boolean(user && sessionToken),
      signIn,
      updateUser,
      signOut,
    }),
    [isLoading, sessionToken, signIn, signOut, updateUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
