// src/providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { getAuth } from '../lib/http';
import { login as doLogin, me as fetchMe, logout as doLogout } from '../lib/auth';

type User = { id: string; username: string; role: string; schoolId: string } | null;

type AuthCtx = {
  user: User;
  isAuthed: boolean;
  loading: boolean;
  login: (username: string, password: string, opts?: { schoolId?: string; schoolName?: string }) => Promise<void>;
  logout: () => void;
};

const AuthCtx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Если есть токен — подтянуть /auth/me
  useEffect(() => {
    const a = getAuth();
    if (!a?.token) { setLoading(false); return; }
    fetchMe()
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string, opts?: { schoolId?: string; schoolName?: string }) {
    const u = await doLogin({ username, password, ...opts });
    setUser(u);
  }

  function logout() {
    doLogout();
    setUser(null);
  }

  return (
    <AuthCtx.Provider value={{ user, isAuthed: !!user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('AuthProvider missing');
  return v;
}
