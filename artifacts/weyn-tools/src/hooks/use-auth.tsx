import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface Session {
  name: string;
  key: string;
}

interface AuthCtx {
  session: Session | null;
  login: (name: string, key: string) => void;
  logout: () => void;
}

const SESSION_KEY = "weyn_session";

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthCtx>({
  session: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession);

  const login = useCallback((name: string, key: string) => {
    const s = { name, key };
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
