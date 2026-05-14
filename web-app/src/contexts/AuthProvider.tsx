import {
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type UserDto } from "@/lib/api";
import { resetConnection } from "@/lib/signalr";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("emoji-chat-token")
  );
  // Initial loading state depends on whether we have a token to verify
  const [isLoading, setIsLoading] = useState(!!token);

  // Restore session on mount
  useEffect(() => {
    if (!token) {
      // If token is null, we are not loading. 
      // Initial state handles the mount case.
      // logout() handles the logout case.
      return;
    }

    // If token exists and we don't have a user, fetch it
    if (!user) {
      let mounted = true;
      api.auth
        .me()
        .then((u) => {
          if (mounted) setUser(u);
        })
        .catch(() => {
          if (mounted) {
            localStorage.removeItem("emoji-chat-token");
            setToken(null);
          }
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
      return () => {
        mounted = false;
      };
    }
  }, [token, user]);

  const login = useCallback(async (googleIdToken: string) => {
    setIsLoading(true);
    try {
      const result = await api.auth.google(googleIdToken);
      localStorage.setItem("emoji-chat-token", result.token);
      setToken(result.token);
      setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("emoji-chat-token");
    setToken(null);
    setUser(null);
    setIsLoading(false);
    resetConnection();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
