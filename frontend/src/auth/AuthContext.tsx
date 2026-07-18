import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me().then(setUser).catch((error) => {
      if (!(error instanceof ApiError) || error.status !== 401) console.error(error);
    }).finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const nextUser = await authApi.login(username, password);
    setUser(nextUser);
    return nextUser;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
