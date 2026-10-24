import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@hausanna/shared';
import { setUnauthorizedHandler } from '../api/client.ts';
import { Api } from '../api/endpoints.ts';

interface AuthState {
  user: User | null;
  checking: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    Api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await Api.login(email, password));
  }, []);

  const logout = useCallback(async () => {
    await Api.logout().catch(() => undefined);
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, checking, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('AuthProvider fehlt');
  return ctx;
}
