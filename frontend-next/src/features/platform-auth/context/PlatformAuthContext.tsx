"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentPlatformUser,
  platformLoginRequest,
  platformLogoutRequest,
} from "../api/platform-auth.api";
import {
  PLATFORM_AUTH_UNAUTHORIZED_EVENT,
  platformAuthSession,
} from "../lib/platform-auth-storage";
import type {
  PlatformLoginInput,
  PlatformUser,
} from "../types/platform-auth.types";

type PlatformAuthContextValue = {
  user: PlatformUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (input: PlatformLoginInput) => Promise<PlatformUser>;
  logout: () => Promise<void>;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | null>(
  null,
);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    platformAuthSession.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    void getCurrentPlatformUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) clearSession();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clearSession]);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener(
      PLATFORM_AUTH_UNAUTHORIZED_EVENT,
      handleUnauthorized,
    );
    return () =>
      window.removeEventListener(
        PLATFORM_AUTH_UNAUTHORIZED_EVENT,
        handleUnauthorized,
      );
  }, [clearSession]);

  const login = async (input: PlatformLoginInput): Promise<PlatformUser> => {
    const result = await platformLoginRequest(input);
    platformAuthSession.setCsrfToken(result.csrfToken);
    setUser(result.user);
    return result.user;
  };

  const logout = async () => {
    try {
      await platformLogoutRequest();
    } finally {
      clearSession();
    }
  };

  return (
    <PlatformAuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </PlatformAuthContext.Provider>
  );
}

export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);

  if (!context) {
    throw new Error(
      "usePlatformAuth debe utilizarse dentro de PlatformAuthProvider.",
    );
  }

  return context;
}
