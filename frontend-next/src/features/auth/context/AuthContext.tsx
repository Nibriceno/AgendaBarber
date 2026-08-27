"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  loginRequest,
  logoutRequest,
} from "../api/auth.api";

import {
  AUTH_UNAUTHORIZED_EVENT,
  authSession,
} from "../lib/auth-storage";

import type {
  AuthUser,
  LoginCredentials,
} from "../types/auth.types";

type AuthContextValue = {
  user: AuthUser | null;

  loading: boolean;

  isAuthenticated: boolean;

  login: (
    credentials: LoginCredentials,
  ) => Promise<AuthUser>;

  logout: () => Promise<void>;

  refreshUser: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const clearSession =
    useCallback(() => {
      authSession.clear();

      setUser(
        null,
      );
    }, []);

  const refreshUser =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        try {
          const currentUser =
            await getCurrentUser();

          setUser(
            currentUser,
          );

        } catch {
          clearSession();
        } finally {
          setLoading(
            false,
          );
        }
      },
      [clearSession],
    );

  const login = async (
    credentials:
      LoginCredentials,
  ): Promise<AuthUser> => {
    const result =
      await loginRequest(
        credentials,
      );

    authSession.setCsrfToken(
      result.csrfToken,
    );

    setUser(
      result.user,
    );

    return result.user;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  };

  useEffect(() => {
    let active = true;

    authSession.removeLegacyCredentials();

    void getCurrentUser()
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
  }, [
    clearSession,
  ]);

  /*
   * Si cualquier request autenticada recibe
   * un 401 porque el JWT expiró o dejó de
   * ser válido, limpiamos también el contexto.
   */
  useEffect(() => {
    const handleUnauthorized =
      () => {
        clearSession();
      };

    window.addEventListener(
      AUTH_UNAUTHORIZED_EVENT,
      handleUnauthorized,
    );

    return () => {
      window.removeEventListener(
        AUTH_UNAUTHORIZED_EVENT,
        handleUnauthorized,
      );
    };
  }, [
    clearSession,
  ]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,

        isAuthenticated:
          Boolean(
            user,
          ),

        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider",
    );
  }

  return context;
}
