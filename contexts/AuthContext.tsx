"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextValue {
  currentUser: User | null;
  idToken: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null,
  idToken: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // forceRefresh=false uses cached token; Firebase auto-refreshes before expiry
        const token = await user.getIdToken(false);
        setIdToken(token);
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Refresh the ID token every 55 minutes (tokens expire after 60 min)
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
      try {
        const token = await currentUser.getIdToken(true);
        setIdToken(token);
      } catch {
        // token refresh failed — user will be signed out by onAuthStateChanged
      }
    }, 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, idToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
